"""Classifier subagent (of the ingestion agent) — document -> DocumentType.

Keyword-first, LLM fallback.

The keyword pass is free and settles the obvious cases (an invoice says
"invoice"). Only when it can't decide (UNKNOWN) do we spend one tiny LLM call
on the head of the document. If no LLM is configured, we degrade to UNKNOWN
rather than raising.
"""

from __future__ import annotations

import logging

from claims_recovery.config import settings
from claims_recovery.models.document import DocumentType
from claims_recovery.services.llm import complete

logger = logging.getLogger(__name__)

# Order matters: dict insertion order breaks score ties, and invoices are the
# demo's stars, so INVOICE wins an "invoice"+"delivery" ambiguity.
_KEYWORDS: dict[DocumentType, tuple[str, ...]] = {
    DocumentType.INVOICE: ("invoice", "inv-", "bill to", "tax invoice"),
    DocumentType.PURCHASE_ORDER: ("purchase order", "po number", "po #", "po-"),
    DocumentType.CONTRACT: (
        "contract",
        "agreement",
        "terms and conditions",
        "pricing schedule",
    ),
    DocumentType.DELIVERY_DOCKET: (
        "delivery docket",
        "delivery note",
        "packing slip",
        "goods received",
        "proof of delivery",
        "docket",
        "asn",
    ),
    DocumentType.REMITTANCE_ADVICE: (
        "remittance advice",
        "remittance",
        "deductions applied",
        "claims / deductions",
        "net amount paid",
        "debit note",
    ),
    DocumentType.PROMO_AGREEMENT: (
        "promotional funding agreement",
        "promo funding",
        "funding cap",
        "scan rebate",
        "promotion detail",
    ),
}

# Doc type is decided by the header/title, so a small head is plenty.
_SNIPPET_CHARS = 2000


def _keyword_scores(markdown: str, filename: str) -> dict[DocumentType, int]:
    hay = (markdown + " " + filename).lower()
    return {dt: sum(kw in hay for kw in kws) for dt, kws in _KEYWORDS.items()}


def keyword_classify(markdown: str, filename: str) -> DocumentType:
    scores = _keyword_scores(markdown, filename)
    best = max(scores, key=lambda dt: scores[dt])
    return best if scores[best] > 0 else DocumentType.UNKNOWN


async def classify_document(markdown: str, filename: str) -> DocumentType:
    scores = _keyword_scores(markdown, filename)
    positive = [dt for dt, s in scores.items() if s > 0]
    # One clear keyword winner -> trust it (free). Otherwise (no hit, or ≥2 types
    # hit — e.g. a PO that references invoice numbers) let the LLM decide.
    if len(positive) == 1:
        return positive[0]

    labels = ", ".join(dt.value for dt in DocumentType)
    messages = [
        {
            "role": "system",
            "content": (
                "You classify business documents for a claims-recovery pipeline. "
                f"Reply with exactly one label from: {labels}. Label only, nothing else."
            ),
        },
        {"role": "user", "content": (markdown[:_SNIPPET_CHARS] or filename)},
    ]
    try:
        # gpt-oss can't disable reasoning (only low/medium/high) — "low" shrinks
        # the reasoning burst. Headroom too: reasoning models spend tokens
        # thinking before the label lands in `content`, and max_tokens is a cap
        # so direct instruct models still stop after one word.
        raw = await complete(
            settings.model_classifier,
            messages,
            temperature=0.0,
            max_tokens=512,
            reasoning_effort="low",
        )
    except Exception:
        # No LLM configured/reachable: fall back to the best keyword guess
        # (UNKNOWN when nothing matched) rather than raising.
        logger.exception("LLM classification unavailable; using keyword best-guess")
        return keyword_classify(markdown, filename)

    return _parse_label(raw)


def _parse_label(raw: str) -> DocumentType:
    text = raw.strip().lower().replace(" ", "_").replace("-", "_")
    for dt in DocumentType:
        if dt is not DocumentType.UNKNOWN and dt.value in text:
            return dt
    return DocumentType.UNKNOWN
