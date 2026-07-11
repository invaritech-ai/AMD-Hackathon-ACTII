from __future__ import annotations

import json
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from claims_recovery.config import settings
from claims_recovery.database import get_db
from claims_recovery.models.case_graph import CaseException, CaseMembershipOverride, DocLink
from claims_recovery.models.document import Document, DocumentType
from claims_recovery.models.invoice import Invoice
from claims_recovery.schemas.api import (
    DocumentDetail,
    DocumentSummary,
    DocumentUploadResponse,
    GraphResponse,
)
from claims_recovery.services.case_graph_service import rebuild_case_graph
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


def _doc_ids(document: Document) -> list[str]:
    if not document.extracted_json:
        return []
    ids = (json.loads(document.extracted_json).get("ids") or {}).values()
    return sorted({str(v) for v in ids if v})


@router.get("", response_model=list[DocumentSummary])
async def list_documents(
    session: AsyncSession = Depends(get_db),
    query: str | None = Query(None, description="substring match on filename"),
    type: DocumentType | None = None,
    case_id: str | None = None,
    unassigned: bool = False,
    exclude_case: str | None = Query(None, description="omit docs already in this case"),
) -> list[DocumentSummary]:
    """The shared document library — search/filter for the case-attach picker."""
    stmt = select(Document)
    if query:
        stmt = stmt.where(Document.original_filename.ilike(f"%{query}%"))
    if type is not None:
        stmt = stmt.where(Document.type == type)
    if case_id is not None:
        stmt = stmt.where(Document.case_id == case_id)
    if unassigned:
        stmt = stmt.where(Document.case_id.is_(None))
    if exclude_case is not None:
        stmt = stmt.where(
            (Document.case_id != exclude_case) | (Document.case_id.is_(None))
        )
    stmt = stmt.order_by(Document.created_at.desc())

    docs = (await session.execute(stmt)).scalars().all()
    out = []
    for d in docs:
        try:
            size = Path(d.file_path).stat().st_size
        except OSError:
            size = 0
        out.append(
            DocumentSummary(
                id=d.id,
                filename=d.original_filename,
                type=d.type,
                status=d.status,
                case_ids=[d.case_id] if d.case_id else [],
                ids=_doc_ids(d),
                created_at=d.created_at,
                size_bytes=size,
            )
        )
    return out


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: str, session: AsyncSession = Depends(get_db)
) -> Response:
    """Permanently delete a document: DB rows, file, and every case/graph link."""
    document = await session.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    # Drop dependents first (FKs have no cascade), then the row, then the file.
    await session.execute(
        delete(DocLink).where(
            (DocLink.doc_a_id == document_id) | (DocLink.doc_b_id == document_id)
        )
    )
    await session.execute(delete(Invoice).where(Invoice.document_id == document_id))
    await session.execute(
        delete(CaseException).where(CaseException.document_id == document_id)
    )
    await session.execute(
        delete(CaseMembershipOverride).where(
            CaseMembershipOverride.document_id == document_id
        )
    )
    file_path = document.file_path
    await session.delete(document)
    await session.commit()

    Path(file_path).unlink(missing_ok=True)
    # Re-derive cases over what's left (also stabilises/prunes emptied cases).
    await rebuild_case_graph(session)
    return Response(status_code=204)


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
