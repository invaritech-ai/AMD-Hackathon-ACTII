"""Generate deterministic synthetic reconciliation documents."""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
SOURCE_DIR = BASE_DIR / "source"
GENERATED_DIR = BASE_DIR / "generated"
MANIFEST_PATH = BASE_DIR / "expected-results.json"


def money(value: object) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


def load_cases(source_dir: Path = SOURCE_DIR) -> list[dict]:
    return [json.loads(path.read_text()) for path in sorted(source_dir.glob("*.json"))]


def _check_totals(case: dict, document_name: str) -> None:
    document = case[document_name]
    calculated = sum(
        money(row["quantity"]) * money(row["unit_price"])
        for row in document["line_items"]
    )
    if calculated != money(document["subtotal"]):
        raise ValueError(
            f"{case['case_id']} {document_name} subtotal does not reconcile"
        )
    if money(document["subtotal"]) + money(document["gst"]) != money(
        document["total"]
    ):
        raise ValueError(
            f"{case['case_id']} {document_name} total does not reconcile"
        )
    for row in document["line_items"]:
        expected = money(row["quantity"]) * money(row["unit_price"])
        if expected != money(row["line_total"]):
            raise ValueError(
                f"{case['case_id']} {document_name} line total does not reconcile"
            )


def validate_cases(cases: list[dict]) -> None:
    if [case["case_id"] for case in cases] != ["case-01", "case-02", "case-03"]:
        raise ValueError("expected case-01, case-02, and case-03")

    seen: set[str] = set()
    for case in cases:
        identifiers = [
            case["po"]["number"],
            case["invoice"]["number"],
            case["pod"]["number"],
            case["debit_note"]["number"],
        ]
        if "promo_agreement" in case:
            identifiers.append(case["promo_agreement"]["number"])
        for identifier in identifiers:
            if not identifier or identifier in seen:
                raise ValueError(f"duplicate identifier: {identifier}")
            seen.add(identifier)

        valid_references = set(identifiers)
        for deduction in case["debit_note"]["deductions"]:
            if deduction["reference"] not in valid_references:
                raise ValueError(
                    f"{case['case_id']} deduction reference is outside the case: "
                    f"{deduction['reference']}"
                )

        _check_totals(case, "po")
        _check_totals(case, "invoice")
        deductions = sum(
            money(row["amount"]) for row in case["debit_note"]["deductions"]
        )
        if deductions != money(case["debit_note"]["total_deductions"]):
            raise ValueError(
                f"{case['case_id']} debit note deductions do not reconcile"
            )
        if money(case["debit_note"]["gross_amount"]) - deductions != money(
            case["debit_note"]["net_amount"]
        ):
            raise ValueError(
                f"{case['case_id']} debit note net amount does not reconcile"
            )

        output_count = 5 if "promo_agreement" in case else 4
        if len(case["outputs"]) != output_count:
            raise ValueError(f"{case['case_id']} output count is incorrect")

        if case["case_id"] == "case-01":
            authorised = money(case["invoice"]["total"]) * Decimal(
                str(case["po"]["early_payment_discount_rate"])
            )
            if authorised != money(case["debit_note"]["deductions"][0]["amount"]):
                raise ValueError("case-01 authorised discount does not reconcile")
        elif case["case_id"] == "case-02":
            po_line = case["po"]["line_items"][0]
            pod_line = case["pod"]["line_items"][0]
            deduction = case["debit_note"]["deductions"][0]
            shortage = money(pod_line["dispatched_quantity"]) - money(
                pod_line["received_quantity"]
            )
            legitimate = shortage * money(po_line["unit_price"])
            if money(deduction["amount"]) - legitimate != Decimal("175.00"):
                raise ValueError("case-02 recovery does not reconcile")
        elif case["case_id"] == "case-03":
            by_reason = {
                row["reason"].lower(): money(row["amount"])
                for row in case["debit_note"]["deductions"]
            }
            promo_excess = by_reason["promotional funding"] - money(
                case["promo_agreement"]["funding_cap"]
            )
            if by_reason["shrinkage"] + promo_excess != Decimal("1320.00"):
                raise ValueError("case-03 recovery does not reconcile")


def _identifier_map(case: dict) -> dict[str, str]:
    identifiers = {
        "po_number": case["po"]["number"],
        "invoice_number": case["invoice"]["number"],
        "delivery_note_number": case["pod"]["number"],
        "debit_note_number": case["debit_note"]["number"],
    }
    if "promo_agreement" in case:
        identifiers["promo_agreement_number"] = case["promo_agreement"]["number"]
    return identifiers


def _case_expectation(case: dict) -> dict:
    discrepancies: list[dict[str, str]] = []
    legitimate = Decimal("0.00")
    recoverable = Decimal("0.00")

    if case["case_id"] == "case-01":
        legitimate = money(case["debit_note"]["deductions"][0]["amount"])
    elif case["case_id"] == "case-02":
        po_line = case["po"]["line_items"][0]
        pod_line = case["pod"]["line_items"][0]
        deduction = case["debit_note"]["deductions"][0]
        actual_shortage = money(pod_line["dispatched_quantity"]) - money(
            pod_line["received_quantity"]
        )
        legitimate = actual_shortage * money(po_line["unit_price"])
        recoverable = money(deduction["amount"]) - legitimate
        discrepancies = [
            {"type": "shortage_quantity_overstated", "amount": "125.00"},
            {"type": "deduction_rate_above_po", "amount": "50.00"},
        ]
    elif case["case_id"] == "case-03":
        deductions = {
            row["reason"].lower(): money(row["amount"])
            for row in case["debit_note"]["deductions"]
        }
        shrinkage = deductions["shrinkage"]
        promo_excess = deductions["promotional funding"] - money(
            case["promo_agreement"]["funding_cap"]
        )
        recoverable = shrinkage + promo_excess
        discrepancies = [
            {"type": "shrinkage_prohibited", "amount": f"{shrinkage:.2f}"},
            {"type": "promo_over_cap", "amount": f"{promo_excess:.2f}"},
        ]

    return {
        "case_id": case["case_id"],
        "label": case["label"],
        "supplier": case["supplier"]["name"],
        "document_count": len(case["outputs"]),
        "documents": [
            {"type": kind, "filename": filename}
            for kind, filename in case["outputs"].items()
        ],
        "identifiers": _identifier_map(case),
        "discrepancies": discrepancies,
        "legitimate_deduction": f"{legitimate:.2f}",
        "recoverable_total": f"{recoverable:.2f}",
    }


def build_expected_results(cases: list[dict]) -> dict:
    validate_cases(cases)
    return {
        "currency": "AUD",
        "expected_case_count": 3,
        "cases": [_case_expectation(case) for case in cases],
    }


def write_manifest(cases: list[dict], path: Path = MANIFEST_PATH) -> dict:
    manifest = build_expected_results(cases)
    path.write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest
