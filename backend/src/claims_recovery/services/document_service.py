from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from anyio import to_thread
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from claims_recovery.agents.agent1_ocr_extractor import extract_fields
from claims_recovery.config import settings
from claims_recovery.models.document import Document, DocumentType
from claims_recovery.models.invoice import Invoice, LineItem
from claims_recovery.services.classifier import classify_document
from claims_recovery.services.ingestion import extract_markdown
from claims_recovery.services.verifier import verify_arithmetic


async def process_document_by_id(session: AsyncSession, document_id: str) -> None:
    """Worker entry point (procrastinate): load a queued row and run the pipeline."""
    document = await session.get(Document, document_id)
    if document is not None:
        await run_pipeline(session, document)


async def run_pipeline(session: AsyncSession, document: Document) -> Document:
    """OCR -> classify -> extract -> verify on an already-persisted document row.

    Runs inline (SQLite/tests) or on the worker (Postgres); the caller owns row
    creation so the upload response can return before this heavy work finishes.
    """
    file_path = Path(document.file_path)
    original_filename = document.original_filename

    # Extract Markdown (tables preserved) off the event loop — OCR is CPU-bound.
    extracted_text = await to_thread.run_sync(extract_markdown, file_path)
    document.extracted_text = extracted_text

    # classify (keyword-first, LLM fallback)
    document.type = await classify_document(extracted_text, original_filename)
    document.status = "extracting"

    # Extract structured fields for every recognised doc type — the linker
    # (slice 3) needs ids from POs/contracts/dockets too, not just invoices.
    fields: dict[str, Any] | None = None
    if document.type != DocumentType.UNKNOWN:
        fields = await extract_fields(extracted_text, document.type.value)
        document.extracted_json = json.dumps(fields)
        # Deterministic arithmetic check — figures reconcile? (slice 2)
        document.verification_json = json.dumps(verify_arithmetic(fields))
        document.status = "classified"

    if document.type == DocumentType.INVOICE and fields:
        invoice = Invoice(
            document_id=document.id,
            invoice_number=fields["ids"].get("invoice_number", ""),
            invoice_date=fields.get("invoice_date") or None,
            supplier_name=fields.get("supplier_name") or None,
            total=fields.get("total", 0),
            raw_text=extracted_text,
        )
        session.add(invoice)
        await session.commit()
        await session.refresh(invoice)

        for item in fields.get("line_items", []):
            line_item = LineItem(
                invoice_id=invoice.id,
                description=item.get("description", ""),
                quantity=item.get("quantity"),
                unit=item.get("unit"),
                unit_price=item.get("unit_price"),
                line_total=item.get("line_total"),
            )
            session.add(line_item)

        await session.commit()

    await session.commit()
    await session.refresh(document)
    return document