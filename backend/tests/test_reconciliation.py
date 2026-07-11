from __future__ import annotations

from claims_recovery.services.reconciliation import compute_exceptions


def test_overcharge_and_unauthorized_charge_are_caught_deterministically():
    # Invoice bills bolts at 310 vs PO-agreed 285 (x120 = 3000 overcharge),
    # plus an 11000 delivery surcharge that appears on no PO line.
    invoice = {
        "ids": {"invoice_number": "INV-1001", "po_number": "PO-8890"},
        "supplier_name": "Kowloon Fasteners Ltd",
        "currency": "HKD",
        "line_items": [
            {"description": "M8 stainless bolts (box/500)", "quantity": 120,
             "unit_price": 310.0, "line_total": 37200.0},
            {"description": "Delivery surcharge", "quantity": 1,
             "unit_price": 11000.0, "line_total": 11000.0},
        ],
        "subtotal": 48200.0, "tax": 0.0, "total": 48200.0,
    }
    po = {
        "ids": {"po_number": "PO-8890"},
        "line_items": [
            {"description": "M8 stainless bolts", "quantity": 120,
             "unit_price": 285.0, "line_total": 34200.0},
        ],
    }

    exc = compute_exceptions([invoice], [po])
    by_type = {e["check_type"]: e for e in exc}

    assert by_type["price_vs_po"]["delta"] == 3000.0        # (310-285)*120
    assert by_type["price_vs_po"]["expected"] == 34200.0
    assert by_type["price_vs_po"]["actual"] == 37200.0
    assert by_type["unauthorized_charge"]["delta"] == 11000.0
    # Total recoverable is the sum of both.
    recoverable = sum(e["delta"] for e in exc if e["check_type"] in ("price_vs_po", "unauthorized_charge"))
    assert recoverable == 14000.0


def test_matching_prices_raise_nothing():
    inv = {
        "ids": {"po_number": "PO-1"}, "currency": "USD",
        "line_items": [{"description": "Widget", "quantity": 10, "unit_price": 5.0, "line_total": 50.0}],
        "subtotal": 50.0, "tax": 0.0, "total": 50.0,
    }
    po = {"ids": {"po_number": "PO-1"},
          "line_items": [{"description": "Widget", "quantity": 10, "unit_price": 5.0}]}
    assert compute_exceptions([inv], [po]) == []


def test_no_po_in_case_means_no_authorisation_exceptions():
    # Without a PO we can't claim "unauthorised" — only internal math would flag.
    inv = {
        "ids": {}, "line_items": [{"description": "X", "quantity": 2, "unit_price": 3.0, "line_total": 6.0}],
        "subtotal": 6.0, "tax": 0.0, "total": 6.0,
    }
    assert compute_exceptions([inv], []) == []
