"""Slice 2 — arithmetic verifier checks."""

from claims_recovery.services.verifier import verify_arithmetic


def _fields(line_total_cod=340.0, subtotal=495.0, tax=99.0, total=594.0):
    return {
        "line_items": [
            {"description": "Cod", "quantity": 40, "unit_price": 8.50, "line_total": line_total_cod},
            {"description": "Haddock", "quantity": 25, "unit_price": 6.20, "line_total": 155.0},
        ],
        "subtotal": subtotal,
        "tax": tax,
        "total": total,
    }


def test_clean_invoice_reconciles():
    out = verify_arithmetic(_fields())
    assert out["ok"] is True
    assert out["findings"] == []


def test_wrong_line_total_is_caught():
    # 40 x 8.50 = 340, but line shows 360 -> line + subtotal both off.
    out = verify_arithmetic(_fields(line_total_cod=360.0))
    assert out["ok"] is False
    checks = {f["check"] for f in out["findings"]}
    assert "line_total" in checks


def test_bad_total_is_caught():
    out = verify_arithmetic(_fields(total=600.0))  # 495 + 99 = 594, not 600
    assert any(f["check"] == "total" for f in out["findings"])


def test_fractional_quantity_within_tolerance():
    f = {"line_items": [{"description": "Fish", "quantity": 12.5, "unit_price": 8.50, "line_total": 106.25}]}
    assert verify_arithmetic(f)["ok"] is True
