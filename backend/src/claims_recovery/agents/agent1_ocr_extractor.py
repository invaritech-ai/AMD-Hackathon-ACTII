"""Agent 1 — structured field extraction from a document's Markdown.

The LLM reads the extracted Markdown and emits structured JSON: the document's
identifiers (its own + any it references), supplier, line items, and the
subtotal/tax/total *as printed*. It never computes — deterministic tools
downstream verify the arithmetic (slice 2) and link the ids into cases
(slice 3). When no LLM is reachable we degrade to a regex best-effort rather
than raising, so the pipeline still runs keyless.

(Kept under the old filename to avoid churn; a rename belongs with the wider
agent rework.)
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from claims_recovery.config import settings
from claims_recovery.services.llm import complete

logger = logging.getLogger(__name__)

# Identifier fields we ask for across every doc type. A doc carries its own id
# (an invoice's invoice_number) and often references others (an invoice citing a
# po_number) — both become edges when the linker runs.
_ID_FIELDS = (
    "invoice_number",
    "po_number",
    "contract_number",
    "delivery_note_number",
    "promo_agreement_number",
)

_SYSTEM = (
    "You extract structured data from business documents (invoices, purchase "
    "orders, contracts, delivery dockets, retailer remittance advices, and "
    "promotional funding agreements) for a claims-recovery pipeline. Copy values "
    "verbatim from the text. NEVER compute, sum, or invent a number — copy only "
    "what is printed. For a remittance advice or debit note, list each deduction "
    "under `claims`. For a promotional funding agreement, fill `promo`. Reply "
    "with a single JSON object and nothing else."
)

_SCHEMA = """{
  "ids": {"invoice_number": "", "po_number": "", "contract_number": "", "delivery_note_number": "", "promo_agreement_number": ""},
  "supplier_name": "",
  "invoice_date": "",
  "delivery_date": "",
  "currency": "",
  "line_items": [{"description": "", "quantity": 0, "unit": "", "unit_price": 0, "line_total": 0}],
  "claims": [{"claim_id": "", "reason": "", "reference": "", "amount": 0, "claim_date": "", "delivery_date": ""}],
  "promo": {"funding_cap": 0, "funding_rate": 0, "start_date": "", "end_date": ""},
  "subtotal": 0,
  "tax": 0,
  "total": 0
}"""


async def extract_fields(text: str, doc_type: str = "") -> dict[str, Any]:
    """Extract structured fields from a document's Markdown via the LLM."""
    messages = [
        {"role": "system", "content": _SYSTEM},
        {
            "role": "user",
            "content": (
                f"Document type: {doc_type or 'unknown'}\n"
                f'Return exactly this JSON shape (use "", 0 or [] when a field '
                f"is absent):\n{_SCHEMA}\n\nDocument:\n{text[:12000]}"
            ),
        },
    ]
    try:
        # ponytail: reasoning_effort is a gpt-oss param (our default extractor).
        # Swap to a plain instruct model -> drop it. max_tokens headroom because
        # reasoning burns tokens before the JSON lands and line items add up.
        raw = await complete(
            settings.model_extractor,
            messages,
            temperature=0.0,
            max_tokens=2048,
            reasoning_effort="low",
        )
        return _normalize(_parse_json(raw))
    except Exception:
        logger.exception("LLM extraction unavailable; using regex best-effort")
        return _regex_fields(text)


def _parse_json(raw: str) -> dict[str, Any]:
    # ponytail: naive outermost-brace slice — tolerates ```json fences and any
    # leading/trailing prose. Fine while the JSON is the last object in output.
    start, end = raw.find("{"), raw.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("no JSON object in model output")
    return json.loads(raw[start : end + 1])


def _num(x: Any) -> float:
    if isinstance(x, (int, float)):
        return float(x)
    m = re.search(r"-?[\d,]*\.?\d+", str(x or ""))
    return float(m.group().replace(",", "")) if m else 0.0


def _normalize(d: dict[str, Any]) -> dict[str, Any]:
    ids_in = d.get("ids") or {}
    ids = {
        k: str(ids_in.get(k, "")).strip()
        for k in _ID_FIELDS
        if str(ids_in.get(k, "")).strip()
    }
    items = [
        {
            "description": str(it.get("description", "")).strip(),
            "quantity": _num(it.get("quantity")),
            "unit": str(it.get("unit", "")).strip(),
            "unit_price": _num(it.get("unit_price")),
            "line_total": _num(it.get("line_total")),
        }
        for it in (d.get("line_items") or [])
    ]
    claims = [
        {
            "claim_id": str(c.get("claim_id", "")).strip(),
            "reason": str(c.get("reason", "")).strip(),
            "reference": str(c.get("reference", "")).strip(),
            "amount": _num(c.get("amount")),
            "claim_date": str(c.get("claim_date", "")).strip(),
            "delivery_date": str(c.get("delivery_date", "")).strip(),
        }
        for c in (d.get("claims") or [])
    ]
    promo_in = d.get("promo") or {}
    promo = {
        "funding_cap": _num(promo_in.get("funding_cap")),
        "funding_rate": _num(promo_in.get("funding_rate")),
        "start_date": str(promo_in.get("start_date", "")).strip(),
        "end_date": str(promo_in.get("end_date", "")).strip(),
    }
    # A deduction's `reference` is a link to the document it's raised against
    # (an invoice, a promo agreement...). Fold references into the id set so the
    # linker connects a remittance to the evidence it claims against.
    for i, c in enumerate(claims):
        if c["reference"]:
            ids[f"claim_ref_{i}"] = c["reference"]
    return {
        "ids": ids,
        "supplier_name": str(d.get("supplier_name", "")).strip(),
        "invoice_date": str(d.get("invoice_date", "")).strip(),
        "delivery_date": str(d.get("delivery_date", "")).strip(),
        "currency": str(d.get("currency", "")).strip(),
        "line_items": items,
        "claims": claims,
        "promo": promo,
        "subtotal": _num(d.get("subtotal")),
        "tax": _num(d.get("tax")),
        "total": _num(d.get("total")),
    }


def _regex_fields(text: str) -> dict[str, Any]:
    """Keyless degrade path: pull what a few regexes can off the raw text."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    ids: dict[str, str] = {}
    if m := re.search(r"INV[-\s]?\d{3,}", text, re.I):
        ids["invoice_number"] = m.group(0)
    if m := re.search(r"\bPO[-\s#]?\d{3,}", text, re.I):
        ids["po_number"] = m.group(0)

    total = 0.0
    if m := re.search(r"total\D{0,10}?([\d,]+\.\d{2})", text, re.I):
        total = _num(m.group(1))

    supplier = ""
    for line in lines[:5]:
        if len(line) > 3 and not re.search(r"invoice|date|page|total", line, re.I):
            supplier = line[:128]
            break

    return {
        "ids": ids,
        "supplier_name": supplier,
        "invoice_date": "",
        "currency": "",
        "line_items": _regex_line_items(lines),
        "subtotal": 0.0,
        "tax": 0.0,
        "total": total,
    }


def _regex_line_items(lines: list[str]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    monetary = re.compile(r"\$?£?([\d,]+\.\d{2})")
    for line in lines:
        amounts = monetary.findall(line)
        if len(amounts) >= 2:
            desc = monetary.sub("", line).strip().rstrip(" -")
            price = _num(amounts[0])
            line_total = _num(amounts[-1])
            items.append({
                "description": desc,
                "quantity": round(line_total / price, 3) if price else 0.0,
                "unit": "",
                "unit_price": price,
                "line_total": line_total,
            })
    return items
