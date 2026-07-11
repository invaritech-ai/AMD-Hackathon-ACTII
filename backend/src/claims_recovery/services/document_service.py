from __future__ import annotations

import json
from pathlib import Path

from anyio import to_thread
from sqlalchemy.ext.asyncio import AsyncSession

from claims_recovery.agents.normalizer_agent import extract_fields
from claims_recovery.models.document import Document, DocumentType
from claims_recovery.models.invoice import Invoice, LineItem
from claims_recovery.services import vision_ocr
from claims_recovery.services.classifier import classify_document
from claims_recovery.services.ingestion import extract_native_text
from claims_recovery.services.verifier import verify_arithmetic

# vision_ocr.classify returns these strings; map to our enum ("other" -> UNKNOWN).
_LABEL_TO_TYPE = {
    "invoice": DocumentType.INVOICE,
    "purchase_order": DocumentType.PURCHASE_ORDER,
    "contract": DocumentType.CONTRACT,
    "delivery_docket": DocumentType.DELIVERY_DOCKET,
    "remittance_advice": DocumentType.REMITTANCE_ADVICE,
    "promo_agreement": DocumentType.PROMO_AGREEMENT,
}


async def process_document_by_id(session: AsyncSession, document_id: str) -> None:
    """Worker entry point (procrastinate): load a queued row and run the pipeline."""
    document = await session.get(Document, document_id)
    if document is not None:
        await run_pipeline(session, document)


async def run_pipeline(session: AsyncSession, document: Document) -> Document:
    """The ingestion agent: orchestrates three subagents over one document.

      classifier subagent  (services/classifier + vision_ocr.classify) — the gate
      OCR subagent         (vision_ocr.transcribe) — scans only
      normalizer subagent  (agents/normalizer_agent.extract_fields)

    Flow: classify -> (gate) -> OCR -> normalize -> verify on a persisted row.

    Runs on the procrastinate worker; the upload handler owns row creation so the
    response returns before this heavy work finishes. `document.status` advances
    through poll-visible stages for the upload UI: queued -> extracting ->
    analyzing -> classified (or failed). Each stage commits immediately so
    GET /documents/{id} reflects it mid-flight.

    Classification is the gate: text-native docs classify on their free text;
    images/scans get one cheap vision classify. Non-target docs stop there — the
    expensive vision OCR only runs for invoices/POs/contracts/dockets.
    """
    file_path = Path(document.file_path)
    original_filename = document.original_filename

    try:
        # Stage 1: pull native text for free (None => image/scan, needs OCR).
        document.status = "extracting"
        await session.commit()
        native_text = await to_thread.run_sync(extract_native_text, file_path)

        # Stage 2: classify — the gate. Text on its text, scans on one vision call.
        document.status = "analyzing"
        await session.commit()
        if native_text is not None:
            document.type = await classify_document(native_text, original_filename)
        else:
            label = await to_thread.run_sync(vision_ocr.classify, file_path)
            document.type = _LABEL_TO_TYPE.get(label, DocumentType.UNKNOWN)

        # Gate: not a target document -> stop before any expensive OCR.
        if document.type == DocumentType.UNKNOWN:
            document.status = "classified"
            await session.commit()
            await session.refresh(document)
            return document

        # Stage 3: get clean Markdown. Native docs already have it; images/scans
        # now get the vision OCR + cleanup (only reached for target documents).
        if native_text is not None:
            extracted_text = native_text
        else:
            extracted_text = await to_thread.run_sync(vision_ocr.transcribe, file_path)
        document.extracted_text = extracted_text

        # Structured fields for every target type — the linker (slice 3) needs
        # ids from POs/contracts/dockets too, not just invoices.
        fields = await extract_fields(extracted_text, document.type.value)
        document.extracted_json = json.dumps(fields)
        # Deterministic arithmetic check — figures reconcile? (slice 2)
        document.verification_json = json.dumps(verify_arithmetic(fields))
        # Promote a few figures to columns for cross-document reconciliation.
        document.total = fields.get("total") or None
        document.currency = fields.get("currency") or None
        document.doc_date = fields.get("invoice_date") or None

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
            await session.flush()

            for item in fields.get("line_items", []):
                session.add(
                    LineItem(
                        invoice_id=invoice.id,
                        description=item.get("description", ""),
                        quantity=item.get("quantity"),
                        unit=item.get("unit"),
                        unit_price=item.get("unit_price"),
                        line_total=item.get("line_total"),
                    )
                )

        # Terminal: every path (including UNKNOWN) reaches a done state.
        document.status = "classified"
        await session.commit()
        await session.refresh(document)
        return document
    except Exception:
        # Never leave a row stuck mid-stage — the UI would spin forever.
        document.status = "failed"
        await session.commit()
        raise