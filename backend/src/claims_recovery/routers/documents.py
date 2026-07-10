from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from claims_recovery.config import settings
from claims_recovery.database import get_db
from claims_recovery.schemas.api import DocumentUploadResponse
from claims_recovery.services.document_service import process_document
from claims_recovery.services.ingestion import SUPPORTED_SUFFIXES, is_supported

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

    document = await process_document(
        session=session,
        file_path=file_path,
        original_filename=file.filename,
    )

    return DocumentUploadResponse(
        document_id=document.id,
        filename=document.original_filename,
        type=document.type,
        status=document.status,
    )
