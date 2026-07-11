from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

import generate
from claims_recovery.services.ingestion import extract_native_text


def test_loads_and_validates_three_distinct_cases():
    cases = generate.load_cases()
    generate.validate_cases(cases)

    assert [case["case_id"] for case in cases] == ["case-01", "case-02", "case-03"]
    assert len({case["supplier"]["name"] for case in cases}) == 3
    assert len({case["po"]["number"] for case in cases}) == 3


def test_validation_rejects_broken_invoice_total():
    cases = generate.load_cases()
    broken = copy.deepcopy(cases)
    broken[0]["invoice"]["total"] = 1

    with pytest.raises(ValueError, match="case-01 invoice total"):
        generate.validate_cases(broken)


def test_validation_rejects_duplicate_identifiers():
    cases = generate.load_cases()
    broken = copy.deepcopy(cases)
    broken[1]["po"]["number"] = broken[0]["po"]["number"]

    with pytest.raises(ValueError, match="duplicate identifier"):
        generate.validate_cases(broken)


def test_expected_results_capture_graph_and_recovery_ground_truth(tmp_path: Path):
    cases = generate.load_cases()
    manifest = generate.build_expected_results(cases)

    by_id = {case["case_id"]: case for case in manifest["cases"]}
    assert manifest["currency"] == "AUD"
    assert by_id["case-01"]["document_count"] == 4
    assert by_id["case-01"]["legitimate_deduction"] == "180.00"
    assert by_id["case-01"]["recoverable_total"] == "0.00"
    assert by_id["case-02"]["legitimate_deduction"] == "125.00"
    assert by_id["case-02"]["recoverable_total"] == "175.00"
    assert by_id["case-03"]["document_count"] == 5
    assert by_id["case-03"]["recoverable_total"] == "1320.00"
    assert {
        item["type"] for item in by_id["case-03"]["discrepancies"]
    } == {"shrinkage_prohibited", "promo_over_cap"}

    target = tmp_path / "expected-results.json"
    generate.write_manifest(cases, target)
    assert json.loads(target.read_text()) == manifest


def test_text_pdf_contains_case_identifiers_and_amounts(tmp_path: Path):
    case = generate.load_cases()[0]
    expected = {
        "purchase_order": [case["po"]["number"], "6,000.00"],
        "invoice": [case["invoice"]["number"], case["po"]["number"]],
        "delivery_docket": [case["pod"]["number"], case["invoice"]["number"]],
        "debit_note": [case["debit_note"]["number"], "180.00"],
    }

    for kind, needles in expected.items():
        target = tmp_path / f"{kind}.pdf"
        generate.render_text_pdf(case, kind, target)
        text = generate.extract_pdf_text(target)
        assert target.stat().st_size > 1000
        assert all(needle in text for needle in needles)


def test_scan_outputs_have_no_native_text_and_expected_formats(tmp_path: Path):
    case_two, case_three = generate.load_cases()[1:]
    case_two_paths = generate.generate_case(case_two, tmp_path)
    case_three_paths = generate.generate_case(case_three, tmp_path)

    pod_jpg = next(path for path in case_two_paths if path.suffix == ".jpg")
    scanned_invoice = next(
        path for path in case_three_paths if path.name.endswith("_scanned.pdf")
    )
    pod_png = next(path for path in case_three_paths if path.suffix == ".png")

    assert extract_native_text(pod_jpg) is None
    assert extract_native_text(pod_png) is None
    assert extract_native_text(scanned_invoice) is None
    assert generate.extract_pdf_text(scanned_invoice).strip() == ""
