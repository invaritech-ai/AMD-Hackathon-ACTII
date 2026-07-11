from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from claims_recovery.database import get_db
from claims_recovery.schemas.api import (
    LedgerCaseResponse,
    LedgerResponse,
    LedgerUpdateRequest,
)
from claims_recovery.services.ledger import (
    LedgerConflict,
    LedgerNotFound,
    get_ledger,
    update_case_ledger,
)

router = APIRouter(tags=["ledger"])


@router.get("/api/v1/ledger", response_model=LedgerResponse)
async def read_ledger(session: AsyncSession = Depends(get_db)) -> LedgerResponse:
    return await get_ledger(session)


@router.patch(
    "/api/v1/cases/{case_id}/ledger", response_model=LedgerCaseResponse
)
async def patch_case_ledger(
    case_id: str,
    body: LedgerUpdateRequest,
    session: AsyncSession = Depends(get_db),
) -> LedgerCaseResponse:
    try:
        return await update_case_ledger(session, case_id, body)
    except LedgerNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except LedgerConflict as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
