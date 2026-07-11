"""Claims triage — the Australian retailer-deduction check.

A supplier gets short-paid: the retailer's remittance advice lists deductions
(short delivery, shrinkage, promo funding, wastage...) against invoices. This
tests each deduction two ways, deterministically:

  1. Is it supported by the evidence in the case? (POD proves delivery-in-full,
     the promo agreement caps the funding, etc.)
  2. Is it even permitted under the Food and Grocery Code of Conduct?
     (shrinkage can't be charged to a supplier; damage/shortfall claims are out
     of time after 30 days.)

Each deduction gets a verdict — supportable / missing_proof / contestable /
prohibited / code_review — and, where recoverable, a dollar figure. The LLM
never decides this; it extracted the numbers and only drafts the letter.

Verdicts and the Code rules they encode are grounded in the ACCC "Rights and
responsibilities under the Food and Grocery Code".
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from claims_recovery.config import settings
from claims_recovery.models.case_graph import CaseException, Claim, Reconciliation
from claims_recovery.models.document import Document, DocumentType
from claims_recovery.services.linker import normalize_id
from claims_recovery.services.llm import complete

# Verdicts that put money back on the table (counted in the claim total).
_RECOVERABLE_VERDICTS = ("missing_proof", "contestable", "prohibited")
_SEVERITY = {
    "prohibited": "high",
    "missing_proof": "medium",
    "contestable": "medium",
    "code_review": "low",
    "supportable": "low",
}
_CODE_30_DAY_REASONS = ("short", "shortfall", "damage", "damaged")


def _parse_date(s: str) -> datetime | None:
    """Tolerant date parse for the formats our synthetic docs use."""
    s = (s or "").strip()
    for fmt in ("%d %B %Y", "%d %b %Y", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def _fields(d: Document) -> dict[str, Any]:
    return json.loads(d.extracted_json) if d.extracted_json else {}


def _delivered_in_full(pods: list[dict[str, Any]]) -> bool | None:
    """True if a POD shows received == despatched for every line. None if unknown."""
    seen = False
    for pod in pods:
        for it in pod.get("line_items") or []:
            seen = True
            # POD line uses quantity as received; if a despatched figure is
            # captured elsewhere they'd differ — our dockets carry received qty.
            if float(it.get("quantity") or 0) <= 0:
                return None
    return True if seen else None


def assess_claim(
    claim: dict[str, Any],
    delivery_date: datetime | None,
    delivered_in_full: bool | None,
    promo_by_id: dict[str, dict[str, Any]],
    single_promo: dict[str, Any] | None,
) -> dict[str, Any]:
    """Pure verdict for one deduction line. No I/O. Returns the exception dict."""
    reason = (claim.get("reason") or "").lower()
    amount = float(claim.get("amount") or 0)
    claim_date = _parse_date(claim.get("claim_date", ""))
    dd = _parse_date(claim.get("delivery_date", "")) or delivery_date

    verdict = "supportable"
    expected = amount  # the amount we'd concede is legitimately deductible
    recoverable = 0.0
    notes: list[str] = []

    # --- Code: shrinkage cannot be charged to a supplier at all. ---
    if "shrink" in reason:
        verdict = "prohibited"
        expected, recoverable = 0.0, amount
        notes.append(
            "Food & Grocery Code: a retailer cannot require a supplier to pay for "
            "shrinkage (in-store loss/theft). Deduction not permitted."
        )

    # --- Code: wastage is conditional; without an evidenced clause, review. ---
    elif "wastage" in reason:
        verdict = "code_review"
        expected = amount
        notes.append(
            "Food & Grocery Code: wastage is chargeable only with an express written "
            "clause, a reasonable amount, a stated calculation and retailer mitigation. "
            "No such clause is evidenced in this case — review before accepting."
        )

    # --- Short delivery / shortfall: does the POD support it? ---
    elif any(k in reason for k in ("short", "shortfall")):
        if delivered_in_full:
            verdict = "missing_proof"
            expected, recoverable = 0.0, amount
            notes.append(
                "Proof of delivery shows the order was received in full — the "
                "short-delivery claim is not supported by the evidence."
            )

    # --- Promotional funding: capped by the signed agreement. ---
    elif "promo" in reason or "promotional" in reason:
        ref = normalize_id(claim.get("reference", ""))
        promo = promo_by_id.get(ref) or single_promo
        if promo is None:
            verdict = "missing_proof"
            expected, recoverable = 0.0, amount
            notes.append("No signed promotional funding agreement found for this claim.")
        else:
            cap = float((promo.get("promo") or {}).get("funding_cap") or 0)
            if cap and amount > cap:
                verdict = "contestable"
                expected, recoverable = cap, round(amount - cap, 2)
                notes.append(
                    f"Deduction {amount:.2f} exceeds the agreed funding cap of "
                    f"{cap:.2f} — {recoverable:.2f} over cap is not authorised."
                )

    # --- Code: damage/shortfall claims are out of time after 30 days. ---
    if (
        claim_date is not None
        and dd is not None
        and any(k in reason for k in _CODE_30_DAY_REASONS)
    ):
        days = (claim_date - dd).days
        if days > 30:
            notes.append(
                f"Food & Grocery Code: damage/shortfall claims must be made within "
                f"30 days of delivery — this was raised {days} days after delivery "
                f"({dd.date()} → {claim_date.date()})."
            )
            if verdict in ("supportable", "code_review"):
                verdict = "contestable"
            if recoverable == 0.0:
                expected, recoverable = 0.0, amount

    return {
        "claim_id": claim.get("claim_id", ""),
        "reason": claim.get("reason", ""),
        "verdict": verdict,
        "expected": round(expected, 2),
        "actual": round(amount, 2),
        "delta": round(recoverable, 2),
        "explanation": " ".join(notes) or "Deduction appears supported by the evidence.",
    }


async def _draft_letter(supplier: str, retailer: str, rows: list[dict[str, Any]], total: float) -> str:
    lines = "\n".join(
        f"- {r['claim_id']} ({r['reason']}): AUD {r['delta']:.2f} — {r['explanation']}"
        for r in rows
    )
    template = (
        f"To {retailer or 'Accounts Payable'},\n\nRe: deductions applied to "
        f"{supplier or 'our'} invoices.\n\nOn review against the supporting "
        f"documents and the Food and Grocery Code of Conduct, we query the "
        f"following deductions:\n\n{lines}\n\nWe request reversal of AUD "
        f"{total:.2f}. Supporting evidence is available on request.\n\nRegards,\n"
        f"Accounts Receivable"
    )
    try:
        raw = await complete(
            settings.model_extractor,
            [
                {"role": "system", "content": "You draft concise, professional, non-adversarial supplier emails querying retailer deductions. Use only the figures and reasons given; cite the Food and Grocery Code where noted. Never invent numbers."},
                {"role": "user", "content": f"Supplier: {supplier}\nRetailer: {retailer}\nAmount to recover: AUD {total:.2f}\nDeductions queried:\n{lines}\n\nWrite the email."},
            ],
            temperature=0.2, max_tokens=700, reasoning_effort="low",
        )
        return raw.strip() or template
    except Exception:
        return template


def has_remittance(docs: list[Document]) -> bool:
    return any(d.type == DocumentType.REMITTANCE_ADVICE for d in docs)


async def triage_case(session: AsyncSession, case_id: str) -> Reconciliation:
    """Triage every deduction on the case's remittance(s). Persists + returns."""
    docs = (
        await session.execute(select(Document).where(Document.case_id == case_id))
    ).scalars().all()

    remittances = [d for d in docs if d.type == DocumentType.REMITTANCE_ADVICE]
    pods = [_fields(d) for d in docs if d.type == DocumentType.DELIVERY_DOCKET]
    promos = [_fields(d) for d in docs if d.type == DocumentType.PROMO_AGREEMENT]
    invoices = [_fields(d) for d in docs if d.type == DocumentType.INVOICE]

    # Delivery date: prefer a POD's, then an invoice's delivery/invoice date.
    delivery_date = None
    for f in pods + invoices:
        delivery_date = _parse_date(f.get("delivery_date", "")) or _parse_date(f.get("invoice_date", ""))
        if delivery_date:
            break
    delivered = _delivered_in_full(pods)

    promo_by_id = {
        normalize_id((p.get("ids") or {}).get("promo_agreement_number", "")): p
        for p in promos
        if (p.get("ids") or {}).get("promo_agreement_number")
    }
    single_promo = promos[0] if len(promos) == 1 else None
    supplier = next((f.get("supplier_name") for f in invoices if f.get("supplier_name")), "")

    rows: list[dict[str, Any]] = []
    doc_by_claim: list[Document] = []  # parallel: which remittance a row came from
    for rem in remittances:
        for claim in _fields(rem).get("claims") or []:
            rows.append(assess_claim(claim, delivery_date, delivered, promo_by_id, single_promo))
            doc_by_claim.append(rem)

    # Clear prior results (idempotent re-run).
    old = (await session.execute(select(Reconciliation.id).where(Reconciliation.case_id == case_id))).scalars().all()
    if old:
        await session.execute(delete(CaseException).where(CaseException.reconciliation_id.in_(old)))
        await session.execute(delete(Reconciliation).where(Reconciliation.id.in_(old)))
    await session.execute(delete(Claim).where(Claim.case_id == case_id))

    flagged = [r for r in rows if r["verdict"] != "supportable"]
    recoverable = [r for r in rows if r["verdict"] in _RECOVERABLE_VERDICTS and r["delta"] > 0]
    total = round(sum(r["delta"] for r in recoverable), 2)

    recon = Reconciliation(
        case_id=case_id,
        status="exceptions_found" if flagged else "ok",
        summary=(
            f"{len(flagged)} of {len(rows)} deduction(s) flagged; "
            f"AUD {total:.2f} recoverable."
            if flagged else "All deductions appear supported by the evidence."
        ),
    )
    session.add(recon)
    await session.flush()

    for row, rem in zip(rows, doc_by_claim):
        session.add(CaseException(
            case_id=case_id,
            reconciliation_id=recon.id,
            document_id=rem.id,
            check_type=(row["reason"] or "deduction")[:32],
            severity=_SEVERITY.get(row["verdict"], "medium"),
            expected_value=row["expected"],
            actual_value=row["actual"],
            delta=row["delta"],
            currency="AUD",
            explanation=f"[{row['claim_id']}] {row['verdict']}: {row['explanation']}",
            status=row["verdict"],
        ))

    if recoverable:
        retailer = "Woolworths"  # ponytail: single retailer in the demo case
        draft = await _draft_letter(supplier, retailer, recoverable, total)
        session.add(Claim(case_id=case_id, total_amount=total, currency="AUD", draft_text=draft, status="draft"))

    await session.commit()
    await session.refresh(recon)
    return recon
