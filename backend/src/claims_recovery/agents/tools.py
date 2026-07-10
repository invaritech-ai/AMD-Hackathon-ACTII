from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

from rapidfuzz import fuzz, process

# ── Load synthetic reference data ──────────────────────

DATA_DIR = Path(__file__).resolve().parents[4] / "data" / "synthetic"


def _load_csv(name: str) -> list[dict[str, str]]:
    path = DATA_DIR / name
    if not path.exists():
        return []
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def _load_json(name: str) -> Any:
    path = DATA_DIR / name
    if not path.exists():
        return {}
    with open(path) as f:
        return json.load(f)


_PURCHASE_ORDERS: list[dict[str, str]] | None = None
_CONTRACTS: dict[str, Any] | None = None


def _get_purchase_orders() -> list[dict[str, str]]:
    global _PURCHASE_ORDERS
    if _PURCHASE_ORDERS is None:
        _PURCHASE_ORDERS = _load_csv("purchase_orders.csv")
    return _PURCHASE_ORDERS


def _get_contracts() -> dict[str, Any]:
    global _CONTRACTS
    if _CONTRACTS is None:
        _CONTRACTS = _load_json("contracts.json")
    return _CONTRACTS


# ── Agent 2 / 3 Tools ──────────────────────────────────

async def find_matching_po(
    supplier_name: str,
    invoice_date: str | None = None,
) -> dict[str, Any]:
    """Find the purchase order that best matches a given supplier name and date.
    Uses fuzzy matching on supplier names."""
    pos = _get_purchase_orders()
    if not pos:
        return {"error": "No purchase orders loaded"}

    suppliers = list({p["supplier"] for p in pos})
    match = process.extractOne(supplier_name, suppliers, scorer=fuzz.token_sort_ratio)
    if not match or match[1] < 60:
        return {"error": f"No matching PO found for supplier: {supplier_name}"}

    matched_supplier = match[0]
    matched_pos = [p for p in pos if p["supplier"] == matched_supplier]

    # Group by po_number
    po_numbers = {row["po_number"] for row in matched_pos}
    po_groups = []
    for po_num in po_numbers:
        po_rows = [r for r in matched_pos if r["po_number"] == po_num]
        po_groups.append({
            "po_number": po_num,
            "invoice_ref": po_rows[0].get("invoice_ref", ""),
            "items": [
                {
                    "description": r["item_desc"],
                    "qty": float(r["qty"]),
                    "unit_price": float(r["unit_price"]),
                    "total": float(r["total"]),
                }
                for r in po_rows
            ],
        })

    return {
        "matched_supplier": matched_supplier,
        "confidence": match[1],
        "purchase_orders": po_groups,
    }


async def lookup_contract_price(
    supplier: str,
    item_description: str,
) -> dict[str, Any]:
    """Look up the contracted price for an item from a supplier."""
    contracts = _get_contracts()
    if not contracts:
        return {"error": "No contracts loaded"}

    # contracts is {"supplier_name": {"products": [{"name": ..., "contracted_price": ...}]}}
    supplier_contracts = contracts.get(supplier)
    if not supplier_contracts:
        # fuzzy match supplier name
        best = process.extractOne(
            supplier, list(contracts.keys()), scorer=fuzz.token_sort_ratio
        )
        if not best or best[1] < 70:
            return {"error": f"No contract found for supplier: {supplier}"}
        supplier_contracts = contracts[best[0]]

    products = supplier_contracts.get("products", [])
    # fuzzy match item description
    product_names = [p["name"] for p in products]
    match = process.extractOne(
        item_description, product_names, scorer=fuzz.token_sort_ratio
    )
    if not match or match[1] < 60:
        return {"error": f"No contract price found for: {item_description}"}

    for p in products:
        if p["name"] == match[0]:
            return {
                "supplier": supplier,
                "item": match[0],
                "contracted_price": p["contracted_price"],
                "confidence": match[1],
            }

    return {"error": f"No contract price found for: {item_description}"}


async def compare_item_price(
    invoice_price: float,
    contracted_price: float,
    quantity: float,
) -> dict[str, Any]:
    """Compare an invoice price against the contracted price.
    Returns any discrepancy found."""
    if invoice_price == contracted_price:
        return {
            "match": True,
            "discrepancy": None,
            "message": f"Price matches contract: {invoice_price}",
        }

    diff = invoice_price - contracted_price
    impact = diff * quantity

    if diff > 0:
        discrepancy_type = "OVERCHARGE"
    else:
        discrepancy_type = "UNDERCHARGE"

    return {
        "match": False,
        "discrepancy": {
            "type": discrepancy_type,
            "contracted_price": contracted_price,
            "invoice_price": invoice_price,
            "difference_per_unit": diff,
            "quantity": quantity,
            "total_impact": impact,
        },
        "message": (
            f"{discrepancy_type}: Contract price is {contracted_price}, "
            f"invoice charges {invoice_price}. "
            f"Impact on {quantity} units: {impact}"
        ),
    }


async def compare_quantities(
    invoice_qty: float,
    po_qty: float,
    item_description: str,
) -> dict[str, Any]:
    """Compare invoice quantity against PO quantity."""
    if invoice_qty == po_qty:
        return {"match": True, "discrepancy": None}

    diff = invoice_qty - po_qty
    return {
        "match": False,
        "discrepancy": {
            "type": "QTY_MISMATCH",
            "description": item_description,
            "invoice_qty": invoice_qty,
            "po_qty": po_qty,
            "difference": diff,
        },
        "message": (
            f"QTY_MISMATCH: Invoice has {invoice_qty}, PO authorized {po_qty}. "
            f"Difference: {diff}"
        ),
    }


async def check_unauthorized_item(
    item_description: str,
    po_items: list[dict[str, Any]],
) -> dict[str, Any]:
    """Check if an invoice line item exists in the PO. Returns unauthorized flag if not found."""
    for po_item in po_items:
        score = fuzz.token_sort_ratio(
            item_description.lower(), po_item.get("description", "").lower()
        )
        if score >= 60:
            return {"found": True, "matched_po_item": po_item["description"]}

    return {
        "found": False,
        "discrepancy": {
            "type": "UNAUTHORIZED_CHARGE",
            "description": item_description,
            "message": f"Item '{item_description}' not found on any purchase order",
        },
    }
