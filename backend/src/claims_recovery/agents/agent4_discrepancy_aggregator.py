from __future__ import annotations

import json
from typing import Any


def aggregate_discrepancies(
    po_matches: list[dict[str, Any]],
    contract_results: list[dict[str, Any]],
) -> dict[str, Any]:
    discrepancies: list[dict[str, Any]] = []

    # Process PO match results
    for match in po_matches:
        for item in match.get("items", []):
            status = item.get("status", "")

            severity = "LOW"
            impact = abs(float(item.get("impact", 0)))

            if status == "UNAUTHORIZED_CHARGE":
                severity = "HIGH"
            elif "PRICE_MISMATCH" in status or "QTY_MISMATCH" in status:
                if impact > 500:
                    severity = "HIGH"
                elif impact > 100:
                    severity = "MEDIUM"

            discrepancy_type = (
                status
                if status in ("PRICE_MISMATCH", "QTY_MISMATCH", "UNAUTHORIZED_CHARGE")
                else "PRICE_MISMATCH"
            )

            discrepancies.append({
                "invoice_number": match.get("invoice", ""),
                "po_number": match.get("matched_po", ""),
                "item_description": item.get("description", ""),
                "expected_quantity": float(item.get("po_qty", 0) or 0),
                "actual_quantity": float(item.get("invoice_qty", 0) or 0),
                "expected_unit_price": float(item.get("po_price", 0) or 0),
                "actual_unit_price": float(item.get("invoice_price", 0) or 0),
                "difference_amount": impact,
                "discrepancy_type": discrepancy_type,
                "severity": severity,
            })

    # Process contract validation results
    for result in contract_results:
        if isinstance(result, dict) and result.get("discrepancy"):
            disc = result["discrepancy"]
            diff = abs(float(disc.get("total_impact", 0)))
            discrepancies.append({
                "invoice_number": "",
                "po_number": "",
                "item_description": disc.get("item", ""),
                "expected_quantity": None,
                "actual_quantity": None,
                "expected_unit_price": float(disc.get("contracted_price", 0)),
                "actual_unit_price": float(disc.get("invoice_price", 0)),
                "difference_amount": diff,
                "discrepancy_type": disc.get("type", "OVERCHARGE"),
                "severity": "HIGH" if diff > 500 else ("MEDIUM" if diff > 100 else "LOW"),
            })

    # Deduplicate
    seen = set()
    unique: list[dict[str, Any]] = []
    for d in discrepancies:
        key = (d["item_description"][:50], d["discrepancy_type"])
        if key not in seen:
            seen.add(key)
            unique.append(d)

    total_claim = sum(d["difference_amount"] for d in unique)

    by_type: dict[str, int] = {}
    for d in unique:
        t = d["discrepancy_type"]
        by_type[t] = by_type.get(t, 0) + 1

    return {
        "total_discrepancies": len(unique),
        "total_claim_value": total_claim,
        "discrepancies": unique,
        "by_type": by_type,
    }