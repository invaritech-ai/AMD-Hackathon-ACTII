"""Case reconciliation — the deterministic catch.

A case is an invoice plus the documents that authorise it (its PO, and later
contracts/dockets). This compares what the invoice *billed* against what the PO
*agreed*, in pure Python. The LLM never decides the maths — it extracted the
numbers (slice 1) and, at the end, only drafts the claim letter prose over
findings we computed here.

Three checks per invoice line:
  * price_vs_po        — billed unit price above the PO's agreed price
  * unauthorized_charge — a line with no matching PO line at all
  * line_math          — the invoice's own qty x price != its printed line total

Recoverable deltas (the first two) sum into the claim amount.
"""

from __future__ import annotations

import json
import re
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from claims_recovery.config import settings
from claims_recovery.models.case_graph import Case, CaseException, Claim, Reconciliation
from claims_recovery.models.document import Document, DocumentType
from claims_recovery.services.llm import complete
from claims_recovery.services.ledger import (
    add_draft_claim,
    ensure_claim_is_draft_or_absent,
)
from claims_recovery.services.verifier import _close, verify_arithmetic

# check_type -> severity for the exceptions we raise.
_SEVERITY = {
    "unauthorized_charge": "high",
    "price_vs_po": "medium",
    "line_math": "low",
}
_RECOVERABLE = ("price_vs_po", "unauthorized_charge")


def _norm(s: str) -> str:
    """Loose description key: lowercase, alnum-only, single-spaced."""
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", (s or "").lower())).strip()


def _match_po(desc_norm: str, po_book: dict[str, dict[str, Any]]) -> dict[str, Any] | None:
    """Find the PO line for an invoice description: exact, then containment."""
    if desc_norm in po_book:
        return po_book[desc_norm]
    for key, line in po_book.items():
        if key and (key in desc_norm or desc_norm in key):
            return line
    return None


def compute_exceptions(
    invoices: list[dict[str, Any]], pos: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Pure core: invoice `fields` vs PO `fields` -> list of exception dicts.

    Each dict: {check_type, doc_index, item, po_number, expected, actual, delta,
    currency, explanation}. `doc_index` indexes into `invoices` so the caller can
    attach the right document_id. No I/O, no LLM — deterministic and testable.
    """
    # Price book from every PO line: normalized description -> agreed unit price.
    po_book: dict[str, dict[str, Any]] = {}
    for po in pos:
        po_number = (po.get("ids") or {}).get("po_number", "")
        for it in po.get("line_items") or []:
            key = _norm(it.get("description", ""))
            if key:
                po_book[key] = {"unit_price": float(it.get("unit_price") or 0), "po_number": po_number}

    out: list[dict[str, Any]] = []
    for idx, inv in enumerate(invoices):
        currency = inv.get("currency") or None
        inv_po = (inv.get("ids") or {}).get("po_number", "")

        # (a) the invoice's own arithmetic must reconcile.
        for f in verify_arithmetic(inv)["findings"]:
            out.append({
                "check_type": "line_math",
                "doc_index": idx,
                "item": f["item"],
                "po_number": inv_po,
                "expected": f["expected"],
                "actual": f["printed"],
                "delta": f["delta"],
                "currency": currency,
                "explanation": f["message"],
            })

        # (b)+(c) each line vs the PO price book.
        for it in inv.get("line_items") or []:
            desc = it.get("description", "")
            qty = float(it.get("quantity") or 0)
            inv_price = float(it.get("unit_price") or 0)
            line_total = float(it.get("line_total") or (qty * inv_price))
            po_line = _match_po(_norm(desc), po_book)

            if po_line is None:
                if not po_book:
                    continue  # no PO in the case -> nothing to authorise against
                out.append({
                    "check_type": "unauthorized_charge",
                    "doc_index": idx,
                    "item": desc,
                    "po_number": inv_po,
                    "expected": 0.0,
                    "actual": round(line_total, 2),
                    "delta": round(line_total, 2),
                    "currency": currency,
                    "explanation": f"'{desc}' billed at {line_total:.2f} but appears on no purchase order.",
                })
                continue

            po_price = po_line["unit_price"]
            if po_price and inv_price and inv_price > po_price and not _close(inv_price, po_price):
                expected = round(po_price * qty, 2)
                actual = round(inv_price * qty, 2)
                out.append({
                    "check_type": "price_vs_po",
                    "doc_index": idx,
                    "item": desc,
                    "po_number": po_line["po_number"] or inv_po,
                    "expected": expected,
                    "actual": actual,
                    "delta": round(actual - expected, 2),
                    "currency": currency,
                    "explanation": (
                        f"'{desc}' billed at {inv_price:.2f}/unit vs PO-agreed "
                        f"{po_price:.2f}/unit over {qty:g} units."
                    ),
                })
    return out


async def _draft_claim_letter(
    supplier: str, exceptions: list[dict[str, Any]], total: float, currency: str
) -> str:
    """LLM writes the recovery-claim prose over our computed findings. Degrades
    to a plain template if no model is reachable — the numbers are ours either way."""
    cur = currency or ""
    lines = "\n".join(
        f"- {e['item']}: claim {cur}{e['delta']:.2f} ({e['explanation']})"
        for e in exceptions
    )
    template = (
        f"Dear {supplier or 'Supplier'},\n\nOn review of your invoice against our "
        f"purchase order we identified the following discrepancies:\n\n{lines}\n\n"
        f"We request a credit of {cur}{total:.2f}. Please confirm.\n\nRegards,\nAccounts Payable"
    )
    try:
        raw = await complete(
            settings.model_extractor,
            [
                {"role": "system", "content": "You draft concise, professional supplier recovery-claim emails. Use only the figures given; never invent numbers."},
                {"role": "user", "content": f"Supplier: {supplier}\nTotal to recover: {cur}{total:.2f}\nFindings:\n{lines}\n\nWrite the email."},
            ],
            temperature=0.2,
            max_tokens=600,
            reasoning_effort="low",
        )
        return raw.strip() or template
    except Exception:
        return template


async def reconcile_case(session: AsyncSession, case_id: str) -> Reconciliation:
    """Run the deterministic checks over a case, persisting exceptions + a claim.

    Idempotent per case: clears prior reconciliations/exceptions/claims for the
    case first, so re-running after a re-upload or attach/detach is clean.
    """
    await ensure_claim_is_draft_or_absent(session, case_id)
    docs = (
        await session.execute(select(Document).where(Document.case_id == case_id))
    ).scalars().all()

    def _fields(d: Document) -> dict[str, Any]:
        return json.loads(d.extracted_json) if d.extracted_json else {}

    invoices = [d for d in docs if d.type == DocumentType.INVOICE]
    pos = [d for d in docs if d.type == DocumentType.PURCHASE_ORDER]
    inv_fields = [_fields(d) for d in invoices]
    po_fields = [_fields(d) for d in pos]

    exceptions = compute_exceptions(inv_fields, po_fields)

    # Clear prior results for this case (idempotent re-run).
    old = (
        await session.execute(select(Reconciliation.id).where(Reconciliation.case_id == case_id))
    ).scalars().all()
    if old:
        await session.execute(delete(CaseException).where(CaseException.reconciliation_id.in_(old)))
        await session.execute(delete(Reconciliation).where(Reconciliation.id.in_(old)))
    await session.execute(delete(Claim).where(Claim.case_id == case_id))

    status = "exceptions_found" if exceptions else "ok"
    recon = Reconciliation(
        case_id=case_id,
        status=status,
        summary=(
            f"{len(exceptions)} exception(s) across {len(invoices)} invoice(s)."
            if exceptions else "All figures reconcile against the purchase order."
        ),
    )
    session.add(recon)
    await session.flush()  # recon.id

    for e in exceptions:
        session.add(CaseException(
            case_id=case_id,
            reconciliation_id=recon.id,
            document_id=invoices[e["doc_index"]].id,
            check_type=e["check_type"],
            severity=_SEVERITY.get(e["check_type"], "medium"),
            expected_value=e["expected"],
            actual_value=e["actual"],
            delta=e["delta"],
            currency=e["currency"],
            explanation=e["explanation"],
            status="open",
        ))

    recoverable = [e for e in exceptions if e["check_type"] in _RECOVERABLE and e["delta"] > 0]
    if recoverable:
        total = round(sum(e["delta"] for e in recoverable), 2)
        currency = next((e["currency"] for e in recoverable if e["currency"]), None)
        supplier = next((f.get("supplier_name") for f in inv_fields if f.get("supplier_name")), "")
        draft = await _draft_claim_letter(supplier, recoverable, total, currency or "")
        await add_draft_claim(
            session,
            case_id=case_id,
            total_amount=total,
            currency=currency,
            draft_text=draft,
        )

    await session.commit()
    await session.refresh(recon)
    return recon
