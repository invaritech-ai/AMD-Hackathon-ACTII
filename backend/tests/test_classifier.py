from __future__ import annotations

import pytest

from claims_recovery.models.document import DocumentType
from claims_recovery.services.classifier import (
    _parse_label,
    classify_document,
    keyword_classify,
)


def test_keyword_invoice():
    md = "# Invoice\nInvoice Number: INV-00009\nBill To: Acme"
    assert keyword_classify(md, "inv-00009.pdf") == DocumentType.INVOICE


def test_keyword_purchase_order():
    assert keyword_classify("PURCHASE ORDER\nPO Number: PO-1", "po.pdf") == (
        DocumentType.PURCHASE_ORDER
    )


def test_keyword_delivery_docket():
    assert keyword_classify("Delivery Note\nPacking Slip", "dd.csv") == (
        DocumentType.DELIVERY_DOCKET
    )


def test_keyword_none_returns_unknown():
    assert keyword_classify("Dashboard\nTotal Contacts", "screenshot.png") == (
        DocumentType.UNKNOWN
    )


def test_invoice_wins_ambiguous_tie():
    # A doc mentioning both invoice and delivery -> invoice (demo priority).
    md = "Tax Invoice for delivery note goods"
    assert keyword_classify(md, "x.pdf") == DocumentType.INVOICE


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("invoice", DocumentType.INVOICE),
        ("  Purchase Order  ", DocumentType.PURCHASE_ORDER),
        ("delivery-docket", DocumentType.DELIVERY_DOCKET),
        ("this is a contract document", DocumentType.CONTRACT),
        ("no idea", DocumentType.UNKNOWN),
    ],
)
def test_parse_label(raw, expected):
    assert _parse_label(raw) == expected


@pytest.mark.asyncio
async def test_llm_fallback_degrades_to_unknown_when_unconfigured():
    # No LLM provider configured in the test env -> complete() raises -> UNKNOWN.
    result = await classify_document("Dashboard\nRandom widget", "screenshot.png")
    assert result == DocumentType.UNKNOWN


# A PO that references invoice numbers hits BOTH invoice and PO keywords.
_AMBIGUOUS = "PURCHASE ORDER PO-2026-001 invoice_ref INV-00009"


@pytest.mark.asyncio
async def test_ambiguous_routes_to_llm(monkeypatch):
    async def fake_complete(spec, messages, **kw):
        return "purchase_order"

    monkeypatch.setattr(
        "claims_recovery.services.classifier.complete", fake_complete
    )
    result = await classify_document(_AMBIGUOUS, "purchase_orders.csv")
    assert result == DocumentType.PURCHASE_ORDER


@pytest.mark.asyncio
async def test_ambiguous_degrades_to_keyword_winner_when_llm_down(monkeypatch):
    async def boom(*a, **k):
        raise RuntimeError("no key")

    monkeypatch.setattr("claims_recovery.services.classifier.complete", boom)
    # LLM down -> keyword best-guess; invoice wins the tie by priority.
    result = await classify_document(_AMBIGUOUS, "x.pdf")
    assert result == DocumentType.INVOICE


@pytest.mark.asyncio
async def test_single_keyword_hit_skips_llm(monkeypatch):
    async def boom(*a, **k):
        raise AssertionError("LLM must not be called on an unambiguous doc")

    monkeypatch.setattr("claims_recovery.services.classifier.complete", boom)
    result = await classify_document("Invoice\nBill To: Acme", "inv.pdf")
    assert result == DocumentType.INVOICE
