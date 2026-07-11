from __future__ import annotations

from datetime import datetime

from claims_recovery.services.triage import assess_claim

DELIVERY = datetime(2026, 5, 8)


def test_shrinkage_is_prohibited_under_code():
    r = assess_claim(
        {"claim_id": "CLM-2", "reason": "Shrinkage", "amount": 612.0, "claim_date": "20 June 2026"},
        DELIVERY, True, {}, None,
    )
    assert r["verdict"] == "prohibited"
    assert r["delta"] == 612.0
    assert "shrinkage" in r["explanation"].lower()


def test_short_delivery_against_full_pod_and_out_of_time():
    r = assess_claim(
        {"claim_id": "CLM-1", "reason": "Short Delivery", "amount": 840.0,
         "claim_date": "28 June 2026", "delivery_date": "08 May 2026"},
        DELIVERY, True, {}, None,
    )
    assert r["verdict"] == "missing_proof"     # POD shows delivered in full
    assert r["delta"] == 840.0
    assert "30 days" in r["explanation"]        # also out of time (51 days)


def test_promo_over_cap_is_contestable_for_the_excess():
    promo = {"promo": {"funding_cap": 2000.0}}
    r = assess_claim(
        {"claim_id": "CLM-3", "reason": "Promotional Funding", "reference": "PROMO-2026-Q2-0087", "amount": 2900.0},
        DELIVERY, True, {"PROMO2026Q20087": promo}, promo,
    )
    assert r["verdict"] == "contestable"
    assert r["expected"] == 2000.0
    assert r["delta"] == 900.0                  # amount over the agreed cap


def test_wastage_needs_code_review_not_auto_recovery():
    r = assess_claim(
        {"claim_id": "CLM-4", "reason": "Wastage", "amount": 430.0, "claim_date": "30 June 2026"},
        DELIVERY, True, {}, None,
    )
    assert r["verdict"] == "code_review"
    assert r["delta"] == 0.0                     # flagged for review, not counted


def test_supported_deduction_passes():
    r = assess_claim(
        {"claim_id": "CLM-9", "reason": "Agreed rebate", "amount": 100.0},
        DELIVERY, True, {}, None,
    )
    assert r["verdict"] == "supportable"
    assert r["delta"] == 0.0
