from __future__ import annotations

import csv
import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "synthetic"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ── Purchase Orders ───────────────────────────────────

purchase_orders = [
    # PO for INV-00009 - TechVendor Co (software/infrastructure)
    {"po_number": "PO-2026-001", "supplier": "TechVendor Co", "invoice_ref": "INV-00009",
     "item_desc": "Cloud Infrastructure", "qty": "1", "unit_price": "8000.00", "total": "8000.00"},
    {"po_number": "PO-2026-001", "supplier": "TechVendor Co", "invoice_ref": "INV-00009",
     "item_desc": "DevOps Support (hours)", "qty": "40", "unit_price": "95.00", "total": "3800.00"},

    # PO for INV-00010 - Enclave Studios (design/creative)
    {"po_number": "PO-2026-002", "supplier": "Enclave Studios", "invoice_ref": "INV-00010",
     "item_desc": "Brand Identity Design", "qty": "1", "unit_price": "4500.00", "total": "4500.00"},
    {"po_number": "PO-2026-002", "supplier": "Enclave Studios", "invoice_ref": "INV-00010",
     "item_desc": "UI/UX Design (pages)", "qty": "12", "unit_price": "350.00", "total": "4200.00"},
    {"po_number": "PO-2026-002", "supplier": "Enclave Studios", "invoice_ref": "INV-00010",
     "item_desc": "Animation Assets", "qty": "5", "unit_price": "600.00", "total": "3000.00"},

    # PO for INV-00011 - FreshSupply Co (FMCG food)
    {"po_number": "PO-2026-003", "supplier": "FreshSupply Co", "invoice_ref": "INV-00011",
     "item_desc": "Beef Chuck Roll (kg)", "qty": "500", "unit_price": "12.00", "total": "6000.00"},
    {"po_number": "PO-2026-003", "supplier": "FreshSupply Co", "invoice_ref": "INV-00011",
     "item_desc": "Chicken Breast (kg)", "qty": "300", "unit_price": "8.50", "total": "2550.00"},
    {"po_number": "PO-2026-003", "supplier": "FreshSupply Co", "invoice_ref": "INV-00011",
     "item_desc": "Atlantic Salmon (kg)", "qty": "150", "unit_price": "22.00", "total": "3300.00"},

    # PO for INV-00013 - PrintWorks Ltd (printing/materials)
    {"po_number": "PO-2026-004", "supplier": "PrintWorks Ltd", "invoice_ref": "INV-00013",
     "item_desc": "Premium Brochure (qty 5000)", "qty": "5000", "unit_price": "1.20", "total": "6000.00"},
    {"po_number": "PO-2026-004", "supplier": "PrintWorks Ltd", "invoice_ref": "INV-00013",
     "item_desc": "Business Cards (qty 2000)", "qty": "2000", "unit_price": "0.15", "total": "300.00"},

    # PO for INV-00014 - LogisticsPro
    {"po_number": "PO-2026-005", "supplier": "LogisticsPro", "invoice_ref": "INV-00014",
     "item_desc": "Cold Chain Transport", "qty": "1", "unit_price": "2800.00", "total": "2800.00"},
    {"po_number": "PO-2026-005", "supplier": "LogisticsPro", "invoice_ref": "INV-00014",
     "item_desc": "Warehouse Storage (days)", "qty": "30", "unit_price": "85.00", "total": "2550.00"},

    # PO for INV-00015 - MarketIntel Analytics
    {"po_number": "PO-2026-006", "supplier": "MarketIntel Analytics", "invoice_ref": "INV-00015",
     "item_desc": "Consumer Survey (responses)", "qty": "1200", "unit_price": "3.50", "total": "4200.00"},
    {"po_number": "PO-2026-006", "supplier": "MarketIntel Analytics", "invoice_ref": "INV-00015",
     "item_desc": "Competitive Analysis Report", "qty": "1", "unit_price": "6500.00", "total": "6500.00"},

    # PO for INV-00016 - Zampa Fish (FMCG seafood)
    {"po_number": "PO-2026-007", "supplier": "Zampa Fish Supplies", "invoice_ref": "INV-00016",
     "item_desc": "Fresh Cod Fillet (kg)", "qty": "200", "unit_price": "18.00", "total": "3600.00"},
    {"po_number": "PO-2026-007", "supplier": "Zampa Fish Supplies", "invoice_ref": "INV-00016",
     "item_desc": "Basa Fillet (kg)", "qty": "300", "unit_price": "9.50", "total": "2850.00"},
    {"po_number": "PO-2026-007", "supplier": "Zampa Fish Supplies", "invoice_ref": "INV-00016",
     "item_desc": "Tiger Prawns (kg)", "qty": "100", "unit_price": "28.00", "total": "2800.00"},

    # PO for synthetic invoice 001 (no real invoice match - used for seed discrepancies)
    {"po_number": "PO-2026-008", "supplier": "GlobalSpice Traders", "invoice_ref": "INV-00017",
     "item_desc": "Black Peppercorns (kg)", "qty": "50", "unit_price": "15.00", "total": "750.00"},
    {"po_number": "PO-2026-008", "supplier": "GlobalSpice Traders", "invoice_ref": "INV-00017",
     "item_desc": "Cumin Seeds (kg)", "qty": "40", "unit_price": "12.00", "total": "480.00"},

    {"po_number": "PO-2026-009", "supplier": "PackRight Solutions", "invoice_ref": "INV-00018",
     "item_desc": "Corrugated Boxes (unit)", "qty": "10000", "unit_price": "0.45", "total": "4500.00"},
    {"po_number": "PO-2026-009", "supplier": "PackRight Solutions", "invoice_ref": "INV-00018",
     "item_desc": "Bubble Wrap Roll", "qty": "50", "unit_price": "35.00", "total": "1750.00"},

    {"po_number": "PO-2026-010", "supplier": "CleanPro Services", "invoice_ref": "INV-00019",
     "item_desc": "Industrial Cleaning", "qty": "1", "unit_price": "2200.00", "total": "2200.00"},
    {"po_number": "PO-2026-010", "supplier": "CleanPro Services", "invoice_ref": "INV-00019",
     "item_desc": "Sanitization Supplies", "qty": "1", "unit_price": "850.00", "total": "850.00"},
]

# Write POs CSV
po_path = DATA_DIR / "purchase_orders.csv"
with open(po_path, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["po_number", "supplier", "invoice_ref", "item_desc", "qty", "unit_price", "total"])
    writer.writeheader()
    writer.writerows(purchase_orders)

print(f"  purchase_orders.csv — {len(purchase_orders)} rows")

# ── Pricing Contracts ────────────────────────────────

contracts = {
    "FreshSupply Co": {
        "supplier": "FreshSupply Co",
        "products": [
            {"name": "Beef Chuck Roll (kg)", "contracted_price": 12.00},
            {"name": "Chicken Breast (kg)", "contracted_price": 8.50},
            {"name": "Atlantic Salmon (kg)", "contracted_price": 22.00},
        ],
    },
    "Zampa Fish Supplies": {
        "supplier": "Zampa Fish Supplies",
        "products": [
            {"name": "Fresh Cod Fillet (kg)", "contracted_price": 18.00},
            {"name": "Basa Fillet (kg)", "contracted_price": 9.50},
            {"name": "Tiger Prawns (kg)", "contracted_price": 28.00},
        ],
    },
    "Enclave Studios": {
        "supplier": "Enclave Studios",
        "products": [
            {"name": "Brand Identity Design", "contracted_price": 4500.00},
            {"name": "UI/UX Design (pages)", "contracted_price": 350.00},
            {"name": "Animation Assets", "contracted_price": 600.00},
        ],
    },
}

contract_path = DATA_DIR / "contracts.json"
with open(contract_path, "w") as f:
    json.dump(contracts, f, indent=2)

print(f"  contracts.json — {len(contracts)} suppliers")

# ── Delivery Dockets ─────────────────────────────────

delivery_dockets = [
    {"docket_number": "DD-2026-101", "po_ref": "PO-2026-003", "supplier": "FreshSupply Co",
     "item_desc": "Beef Chuck Roll (kg)", "qty_ordered": "500", "qty_delivered": "480", "date": "2026-03-20"},
    {"docket_number": "DD-2026-101", "po_ref": "PO-2026-003", "supplier": "FreshSupply Co",
     "item_desc": "Chicken Breast (kg)", "qty_ordered": "300", "qty_delivered": "300", "date": "2026-03-20"},

    {"docket_number": "DD-2026-102", "po_ref": "PO-2026-007", "supplier": "Zampa Fish Supplies",
     "item_desc": "Fresh Cod Fillet (kg)", "qty_ordered": "200", "qty_delivered": "195", "date": "2026-03-21"},
    {"docket_number": "DD-2026-102", "po_ref": "PO-2026-007", "supplier": "Zampa Fish Supplies",
     "item_desc": "Tiger Prawns (kg)", "qty_ordered": "100", "qty_delivered": "100", "date": "2026-03-21"},

    {"docket_number": "DD-2026-103", "po_ref": "PO-2026-002", "supplier": "Enclave Studios",
     "item_desc": "UI/UX Design (pages)", "qty_ordered": "12", "qty_delivered": "12", "date": "2026-03-18"},
]

docket_path = DATA_DIR / "delivery_dockets.csv"
with open(docket_path, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["docket_number", "po_ref", "supplier", "item_desc", "qty_ordered", "qty_delivered", "date"])
    writer.writeheader()
    writer.writerows(delivery_dockets)

print(f"  delivery_dockets.csv — {len(delivery_dockets)} rows")
print("Synthetic data generated.")