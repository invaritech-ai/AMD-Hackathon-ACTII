from __future__ import annotations

import io
from pathlib import Path

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_upload_unsupported_type_rejected(client: AsyncClient):
    resp = await client.post(
        "/api/v1/documents/upload",
        files={"file": ("archive.zip", io.BytesIO(b"PK\x03\x04"), "application/zip")},
    )
    assert resp.status_code == 400


INVOICE_DIR = Path(__file__).resolve().parents[2] / "data" / "invoices"


@pytest.mark.asyncio
async def test_upload_enqueues_then_worker_processes(client: AsyncClient, session):
    # Find the first available invoice PDF
    pdfs = list(INVOICE_DIR.glob("*.pdf"))
    if not pdfs:
        pytest.skip("No invoice PDFs available")

    with open(pdfs[0], "rb") as f:
        resp = await client.post(
            "/api/v1/documents/upload",
            files={"file": (pdfs[0].name, f, "application/pdf")},
        )

    # Async upload: the row exists and the job is queued, not yet processed.
    assert resp.status_code == 200
    data = resp.json()
    doc_id = data["document_id"]
    assert doc_id
    assert data["status"] == "queued"
    assert data["type"] == "unknown"

    # Run the pipeline as the worker would, then poll the document.
    from claims_recovery.services.document_service import process_document_by_id

    await process_document_by_id(session, doc_id)

    got = await client.get(f"/api/v1/documents/{doc_id}")
    assert got.status_code == 200
    detail = got.json()
    assert detail["type"] == "invoice"
    assert detail["status"] == "classified"


@pytest.mark.asyncio
async def test_pipeline_failure_marks_document_failed(session, monkeypatch):
    # A crash mid-pipeline must land on "failed", never leave the row spinning.
    from claims_recovery.models.document import Document
    from claims_recovery.services import document_service

    def boom(_path):
        raise RuntimeError("OCR exploded")

    monkeypatch.setattr(document_service, "extract_native_text", boom)

    doc = Document(
        filename="x.pdf",
        original_filename="x.pdf",
        file_path="/nonexistent/x.pdf",
        status="queued",
    )
    session.add(doc)
    await session.commit()

    with pytest.raises(RuntimeError):
        await document_service.process_document_by_id(session, doc.id)

    await session.refresh(doc)
    assert doc.status == "failed"


def test_ocr_extractor_regex_fallback():
    # The keyless degrade path (no LLM) — deterministic, no network.
    from claims_recovery.agents.normalizer_agent import _regex_fields

    text = """INVOICE
Invaritech Limited
Invoice #: INV-00042
Date: 2026-03-15

Cloud Infrastructure  1  $8,500.00  $8,500.00
DevOps Support          40  $98.75    $3,950.00

Total: $12,450.00"""

    data = _regex_fields(text)
    assert data["ids"]["invoice_number"] == "INV-00042"
    assert data["supplier_name"] == "Invaritech Limited"
    assert data["total"] == 12450.00
    assert len(data["line_items"]) == 2


def _seed_doc(original, dtype, ids):
    """A processed document row for graph tests (mirrors seed._doc)."""
    import json as _json
    from claims_recovery.models.document import Document

    return Document(
        filename=f"t_{original}",
        original_filename=original,
        file_path=f"/tmp/{original}",
        type=dtype,
        status="classified",
        extracted_json=_json.dumps({"ids": ids}),
    )


@pytest.mark.asyncio
async def test_manual_attach_detach_survives_rebuild(client: AsyncClient, session):
    """Model A: manual pin/exclude must outlive the next component rebuild."""
    from claims_recovery.models.document import DocumentType
    from claims_recovery.services.case_graph_service import rebuild_case_graph

    a = _seed_doc("A-INV.pdf", DocumentType.INVOICE, {"po_number": "PO-1"})
    b = _seed_doc("B-PO.pdf", DocumentType.PURCHASE_ORDER, {"po_number": "PO-1"})
    c = _seed_doc("C-INV.pdf", DocumentType.INVOICE, {"po_number": "PO-2"})
    session.add_all([a, b, c])
    await session.commit()
    await rebuild_case_graph(session)

    for d in (a, b, c):
        await session.refresh(d)
    assert a.case_id == b.case_id and a.case_id is not None  # auto-grouped by PO-1
    assert c.case_id != a.case_id                            # PO-2 stands alone
    case_ab = a.case_id

    # Detach B → persistent exclusion.
    resp = await client.delete(f"/api/v1/cases/{case_ab}/documents/{b.id}")
    assert resp.status_code == 204
    await session.refresh(b)
    assert b.case_id is None

    # A new upload triggers another rebuild — B must NOT snap back into the case.
    await rebuild_case_graph(session)
    await session.refresh(b)
    assert b.case_id is None

    c_old_case = c.case_id
    # Attach C (shares no id with A) → pinned in, returned graph shows both.
    resp = await client.post(
        f"/api/v1/cases/{case_ab}/documents", json={"document_id": c.id}
    )
    assert resp.status_code == 200
    node_ids = {n["id"] for n in resp.json()["nodes"]}
    assert {a.id, c.id} <= node_ids and b.id not in node_ids

    # Pin also survives a rebuild.
    await rebuild_case_graph(session)
    await session.refresh(c)
    assert c.case_id == case_ab

    # C's old case is now empty and must be pruned, not left as a 0-doc orphan.
    from claims_recovery.models.case_graph import Case
    assert await session.get(Case, c_old_case) is None


@pytest.mark.asyncio
async def test_attach_unknown_ids_error(client: AsyncClient, session):
    resp = await client.post(
        "/api/v1/cases/nope/documents", json={"document_id": "ghost"}
    )
    assert resp.status_code == 404
    resp = await client.delete("/api/v1/cases/nope/documents/ghost")
    assert resp.status_code == 404
