from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from claims_recovery.database import get_db
from claims_recovery.schemas.api import LedgerResponse
from claims_recovery.services.ledger import get_ledger

router = APIRouter(tags=["ledger"])


@router.get("/api/v1/ledger", response_model=LedgerResponse)
async def read_ledger(session: AsyncSession = Depends(get_db)) -> LedgerResponse:
    return await get_ledger(session)
