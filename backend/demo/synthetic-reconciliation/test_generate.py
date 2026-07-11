from __future__ import annotations

import copy

import pytest

import generate


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
