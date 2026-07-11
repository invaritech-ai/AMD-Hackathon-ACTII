"""Demo seed: an HKD reconciliation case so the app shows data without an upload.

Proves file-wise grouping (a doc + everything it transitively shares an id with
= ONE case) and gives the demo a second currency alongside the uploaded AUD
claims case:

  Case A: INV-1001, INV-1002, PO-8890, GDN-0077  — all carry PO-8890, so they
          collapse into one case. INV-1001 is billed above the PO price and
          carries an off-PO surcharge → reconcile_case recovers HK$14,000.
  Case B: INV-2001                               — its PO (PO-9999) isn't in the
          set, so it stands alone.

Everything the checks need lives in each document's `extracted_json` (the same
shape the ingestion pipeline writes), so no legacy ledger tables are involved.

Run:  docker compose run --rm api python -m claims_recovery.seed
"""

from __future__ import annotations

import asyncio
import json

from sqlalchemy import text

from claims_recovery.database import async_session_factory
from claims_recovery.models.document import Document, DocumentType
from claims_recovery.services.case_graph_service import rebuild_case_graph

# ponytail: truncate-and-insert. A demo seed is idempotent by wiping the app
# tables first (procrastinate_* untouched).
_APP_TABLES = (
    "line_items, invoices, exceptions, reconciliations, claims, "
    "case_membership_overrides, doc_links, documents, cases"
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
        await session.execute(text(f"TRUNCATE {_APP_TABLES} RESTART IDENTITY CASCADE"))

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
        await session.commit()

        # Persist the case graph (cases + doc_links + documents.case_id) so the
        # /cases endpoints have data, same as an upload would.
        await rebuild_case_graph(session)

    print("Seeded: 5 documents (2 cases) — HKD reconciliation demo.")


if __name__ == "__main__":
    asyncio.run(seed())
