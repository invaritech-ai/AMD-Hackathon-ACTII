"""Slice 1 — the deterministic bits of field extraction (JSON parse + normalize).

The LLM call itself isn't unit-testable offline; these cover the parsing and
coercion that turn a model's messy reply into the fixed downstream shape.
"""

from claims_recovery.agents.agent1_ocr_extractor import _normalize, _num, _parse_json


def test_parse_json_strips_fences_and_prose():
    raw = 'Here you go:\n```json\n{"total": 10, "note": "}"}\n```\nDone.'
    assert _parse_json(raw)["total"] == 10


def test_num_coerces_currency_and_thousands():
    assert _num("£1,000.00") == 1000.0
    assert _num("$12.50") == 12.50
    assert _num("") == 0.0
    assert _num(None) == 0.0
    assert _num(7) == 7.0


def test_normalize_fills_defaults_and_drops_empty_ids():
    out = _normalize({
        "ids": {"invoice_number": "INV-1", "po_number": ""},
        "line_items": [{"description": "Cod", "quantity": "2", "unit_price": "£3.50"}],
        "total": "1,234.56",
    })
    assert out["ids"] == {"invoice_number": "INV-1"}  # empty po_number dropped
    assert out["line_items"][0]["quantity"] == 2.0
    assert out["line_items"][0]["unit_price"] == 3.50
    assert out["line_items"][0]["line_total"] == 0.0  # absent -> default
    assert out["total"] == 1234.56
    assert out["supplier_name"] == ""  # absent -> default
