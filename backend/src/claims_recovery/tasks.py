"""Procrastinate tasks. Each opens its own async session (worker process)."""

from __future__ import annotations

from claims_recovery.database import async_session_factory
from claims_recovery.procrastinate_app import app
from claims_recovery.services.document_service import process_document_by_id


@app.task(name="process_document")
async def process_document_task(document_id: str) -> None:
    async with async_session_factory() as session:
        await process_document_by_id(session, document_id)
