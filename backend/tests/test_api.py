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
async def test_ledger_empty(client: AsyncClient):
    resp = await client.get("/api/v1/ledger")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_claims"] == 0
    assert data["by_supplier"] == []


@pytest.mark.asyncio
async def test_create_run_invalid_id(client: AsyncClient):
    resp = await client.post(
        "/api/v1/runs",
        json={"document_ids": ["nonexistent"]},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_nonexistent_run(client: AsyncClient):
    resp = await client.get("/api/v1/runs/nonexistent")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_full_upload_and_run(client: AsyncClient, session):
    pdfs = list(INVOICE_DIR.glob("*.pdf"))
    if not pdfs:
        pytest.skip("No invoice PDFs available")

    # Upload, then run the pipeline as the worker would so an invoice exists.
    with open(pdfs[0], "rb") as f:
        upload_resp = await client.post(
            "/api/v1/documents/upload",
            files={"file": (pdfs[0].name, f, "application/pdf")},
        )
    assert upload_resp.status_code == 200
    doc_id = upload_resp.json()["document_id"]

    from claims_recovery.services.document_service import process_document_by_id

    await process_document_by_id(session, doc_id)

    # Create run (may fail if no Fireworks key, but should return a response)
    run_resp = await client.post(
        "/api/v1/runs",
        json={"document_ids": [doc_id]},
    )
    assert run_resp.status_code == 200
    run_data = run_resp.json()
    assert run_data["id"]
    assert run_data["status"] in ("completed", "failed", "running")

    # Get run status
    status_resp = await client.get(f"/api/v1/runs/{run_data['id']}")
    assert status_resp.status_code == 200

    # Check ledger updated
    ledger_resp = await client.get("/api/v1/ledger")
    assert ledger_resp.status_code == 200


def test_ocr_extractor_regex_fallback():
    # The keyless degrade path (no LLM) — deterministic, no network.
    from claims_recovery.agents.agent1_ocr_extractor import _regex_fields

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


@pytest.mark.asyncio
async def test_discrepancy_aggregator():
    from claims_recovery.agents.agent4_discrepancy_aggregator import aggregate_discrepancies

    po_matches = []
    contract_results = [
        {
            "discrepancy": {
                "type": "OVERCHARGE",
                "item": "Beef Chuck Roll (kg)",
                "contracted_price": 12.00,
                "invoice_price": 12.50,
                "total_impact": 250.00,
            }
        }
    ]

    result = aggregate_discrepancies(po_matches, contract_results)
    assert result["total_discrepancies"] == 1
    assert result["total_claim_value"] == 250.00
    assert result["by_type"]["OVERCHARGE"] == 1


@pytest.mark.asyncio
async def test_tools_find_matching_po():
    from claims_recovery.agents.tools import find_matching_po

    result = await find_matching_po("FreshSupply Co")
    assert "error" not in result
    assert result["matched_supplier"] == "FreshSupply Co"


@pytest.mark.asyncio
async def test_tools_lookup_contract():
    from claims_recovery.agents.tools import lookup_contract_price

    result = await lookup_contract_price("FreshSupply Co", "Beef Chuck Roll")
    assert "error" not in result
    assert result["contracted_price"] == 12.00
