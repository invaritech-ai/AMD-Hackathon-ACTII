from __future__ import annotations

import json
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from claims_recovery.config import settings
from claims_recovery.database import get_db
from claims_recovery.models.document import Document, DocumentType
from claims_recovery.schemas.api import (
    DocumentDetail,
    DocumentUploadResponse,
    GraphResponse,
)
from claims_recovery.services.ingestion import SUPPORTED_SUFFIXES, is_supported
from claims_recovery.services.linker import build_graph

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])

UPLOAD_DIR = settings.upload_dir


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile,
    session: AsyncSession = Depends(get_db),
) -> DocumentUploadResponse:
    if not file.filename or not is_supported(file.filename):
        supported = ", ".join(sorted(SUPPORTED_SUFFIXES))
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Accepted: {supported}",
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    safe_name = f"{uuid.uuid4().hex[:12]}_{file.filename}"
    file_path = UPLOAD_DIR / safe_name

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    document = Document(
        filename=file_path.name,
        original_filename=file.filename,
        file_path=str(file_path.absolute()),
        type=DocumentType.UNKNOWN,
        status="queued",
    )
    session.add(document)
    await session.commit()
    await session.refresh(document)

    # Hand off to the procrastinate worker, return immediately. type/status stay
    # unknown/queued until the worker finishes — poll GET /documents/{id} (or the
    # graph) to watch them resolve.
    from claims_recovery.tasks import process_document_task

    await process_document_task.defer_async(document_id=document.id)

    return DocumentUploadResponse(
        document_id=document.id,
        filename=document.original_filename,
        type=document.type,
        status=document.status,
    )


@router.get("/graph", response_model=GraphResponse)
async def document_graph(session: AsyncSession = Depends(get_db)) -> GraphResponse:
    """Case graph over all documents: nodes=docs, edges=shared ids (slice 3)."""
    result = await session.execute(select(Document))
    docs = [
        {
            "id": d.id,
            "type": d.type.value,
            "filename": d.original_filename,
            "ids": (json.loads(d.extracted_json).get("ids") if d.extracted_json else {}) or {},
        }
        for d in result.scalars()
    ]
    return GraphResponse.model_validate(build_graph(docs))


# Dynamic path last so it doesn't shadow /graph.
@router.get("/{document_id}", response_model=DocumentDetail)
async def get_document(
    document_id: str, session: AsyncSession = Depends(get_db)
) -> DocumentDetail:
    """Poll a document's processing state (async upload flow)."""
    document = await session.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentDetail(
        id=document.id,
        filename=document.original_filename,
        type=document.type,
        status=document.status,
        extracted_text=document.extracted_text,
        # Column stores JSON text; the schema exposes it as an object.
        extracted_json=json.loads(document.extracted_json) if document.extracted_json else None,
        created_at=document.created_at,
    )
