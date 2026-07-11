"""Demo seed: plants a believable dataset so the frontend shows real data.

Scenario (proves file-wise grouping — a doc + everything it transitively
shares an id with = ONE case):

  Case A: INV-1001, INV-1002, PO-8890, GDN-0077  — all four carry PO-8890,
          so they collapse into a single case (the docket/PO glue the two
          invoices together even though the invoices share no id directly).
  Case B: INV-2001                               — its PO (PO-9999) isn't in
          the set, so it stands alone.

Also seeds the legacy run/ledger tables (invoices, one pipeline_run, two
discrepancies, one recovery_claim) so the Discrepancies/Claims/Ledger views
light up too.

Run:  docker compose run --rm api python -m claims_recovery.seed
"""

from __future__ import annotations

import asyncio
import json
from decimal import Decimal

from sqlalchemy import text

from claims_recovery.database import async_session_factory
from claims_recovery.models.discrepancy import (
    Discrepancy,
    DiscrepancyType,
    Severity,
)
from claims_recovery.models.document import Document, DocumentType
from claims_recovery.models.invoice import Invoice, LineItem
from claims_recovery.models.pipeline_run import PipelineRun, RunStatus
from claims_recovery.models.recovery_claim import RecoveryClaim
from claims_recovery.services.case_graph_service import rebuild_case_graph

# ponytail: truncate-and-insert. A demo seed is idempotent by wiping the app
# tables first (procrastinate_* untouched). Make it upsert if we ever seed
# alongside real data.
_APP_TABLES = (
    "line_items, invoices, discrepancies, recovery_claims, pipeline_runs, "
    "exceptions, reconciliations, claims, case_membership_overrides, "
    "doc_links, documents, cases"
)


def _doc(
    original: str,
    dtype: DocumentType,
    ids: dict[str, str],
    fields: dict | None = None,
) -> Document:
    """A processed document row. `ids` is what the graph links on; `fields`
    merges extra extracted_json (line_items etc.) so reconciliation has data."""
    payload = {"ids": ids, **(fields or {})}
    return Document(
        filename=f"seed_{original}",
        original_filename=original,
        file_path=f"/app/data/seed/{original}",
        type=dtype,
        status="classified",
        extracted_json=json.dumps(payload),
    )


async def seed() -> None:
    async with async_session_factory() as session:
        await session.execute(
            text(f"TRUNCATE {_APP_TABLES} RESTART IDENTITY CASCADE")
        )

        # --- Case A: four docs, one component via shared PO-8890 ---
        inv1 = _doc(
            "INV-1001.pdf",
            DocumentType.INVOICE,
            {"invoice_number": "INV-1001", "po_number": "PO-8890"},
            {
                "supplier_name": "Kowloon Fasteners Ltd",
                "currency": "HKD",
                "invoice_date": "2026-06-14",
                "line_items": [
                    # Billed at 310/box vs PO-agreed 285 -> 3,000 overcharge.
                    {"description": "M8 stainless bolts (box/500)", "quantity": 120,
                     "unit": "box", "unit_price": 310.0, "line_total": 37200.0},
                    # Not on the PO at all -> 11,000 unauthorised charge.
                    {"description": "Delivery surcharge", "quantity": 1,
                     "unit": "ea", "unit_price": 11000.0, "line_total": 11000.0},
                ],
                "subtotal": 48200.0, "tax": 0.0, "total": 48200.0,
            },
        )
        inv2 = _doc(
            "INV-1002.pdf",
            DocumentType.INVOICE,
            {"invoice_number": "INV-1002", "po_number": "PO-8890"},
        )
        po = _doc(
            "PO-8890.pdf",
            DocumentType.PURCHASE_ORDER,
            {"po_number": "PO-8890"},
            {
                "supplier_name": "Kowloon Fasteners Ltd",
                "currency": "HKD",
                "line_items": [
                    {"description": "M8 stainless bolts (box/500)", "quantity": 120,
                     "unit": "box", "unit_price": 285.0, "line_total": 34200.0},
                ],
            },
        )
        docket = _doc(
            "GDN-0077.pdf",
            DocumentType.DELIVERY_DOCKET,
            {"docket_number": "GDN-0077", "po_number": "PO-8890"},
        )
        # --- Case B: standalone invoice (its PO isn't in the set) ---
        inv3 = _doc(
            "INV-2001.pdf",
            DocumentType.INVOICE,
            {"invoice_number": "INV-2001", "po_number": "PO-9999"},
        )
        session.add_all([inv1, inv2, po, docket, inv3])
        await session.flush()  # assign ids

        # --- Legacy ledger: invoices + one run + discrepancies + a claim ---
        invoice1 = Invoice(
            document_id=inv1.id,
            invoice_number="INV-1001",
            invoice_date="2026-06-14",
            supplier_name="Kowloon Fasteners Ltd",
            currency="HKD",  # invoices.currency is String(8); "HK Dollar" won't fit
            subtotal=Decimal("48200.00"),
            tax=Decimal("0.00"),
            total=Decimal("48200.00"),
            line_items=[
                LineItem(
                    description="M8 stainless bolts (box/500)",
                    quantity=Decimal("120"),
                    unit="box",
                    unit_price=Decimal("310.00"),  # PO price was 285.00
                    line_total=Decimal("37200.00"),
                ),
                LineItem(
                    description="Delivery surcharge",
                    quantity=Decimal("1"),
                    unit="ea",
                    unit_price=Decimal("11000.00"),  # not on the PO
                    line_total=Decimal("11000.00"),
                ),
            ],
        )
        invoice2 = Invoice(
            document_id=inv2.id,
            invoice_number="INV-1002",
            invoice_date="2026-06-21",
            supplier_name="Kowloon Fasteners Ltd",
            currency="HKD",
            subtotal=Decimal("15400.00"),
            tax=Decimal("0.00"),
            total=Decimal("15400.00"),
        )
        session.add_all([invoice1, invoice2])
        await session.flush()

        run = PipelineRun(
            status=RunStatus.COMPLETED,
            document_ids=json.dumps([inv1.id, inv2.id, po.id, docket.id]),
            total_discrepancies=2,
            total_claim_value=14000.0,
        )
        session.add(run)
        await session.flush()

        session.add_all(
            [
                Discrepancy(
                    run_id=run.id,
                    invoice_id=invoice1.id,
                    invoice_number="INV-1001",
                    po_number="PO-8890",
                    item_description="M8 stainless bolts (box/500)",
                    expected_unit_price=285.00,
                    actual_unit_price=310.00,
                    difference_amount=3000.00,  # 25 * 120
                    discrepancy_type=DiscrepancyType.PRICE_MISMATCH,
                    severity=Severity.MEDIUM,
                    explanation="Billed at HK$310/box vs PO-agreed HK$285/box.",
                ),
                Discrepancy(
                    run_id=run.id,
                    invoice_id=invoice1.id,
                    invoice_number="INV-1001",
                    po_number="PO-8890",
                    item_description="Delivery surcharge",
                    actual_unit_price=11000.00,
                    difference_amount=11000.00,
                    discrepancy_type=DiscrepancyType.UNAUTHORIZED_CHARGE,
                    severity=Severity.HIGH,
                    explanation="Delivery surcharge not present on PO-8890.",
                ),
            ]
        )
        session.add(
            RecoveryClaim(
                run_id=run.id,
                invoice_id=invoice1.id,
                invoice_number="INV-1001",
                po_number="PO-8890",
                total_claim_amount=14000.00,
                draft_text=(
                    "Re: INV-1001 against PO-8890 — we identified an overcharge "
                    "of HK$3,000 (bolt unit price) and an unauthorised delivery "
                    "surcharge of HK$11,000. We request a credit of HK$14,000."
                ),
                status="DRAFT",
            )
        )

        await session.commit()

        # Persist the case graph (cases + doc_links + documents.case_id) so the
        # /cases endpoints have data, same as an upload would.
        await rebuild_case_graph(session)

    print("Seeded: 5 documents (2 cases), 2 invoices, 1 run, 2 discrepancies, 1 claim.")


if __name__ == "__main__":
    asyncio.run(seed())
