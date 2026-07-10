from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from claims_recovery.database import get_db
from claims_recovery.models.discrepancy import Discrepancy
from claims_recovery.models.invoice import Invoice
from claims_recovery.models.recovery_claim import RecoveryClaim
from claims_recovery.schemas.api import LedgerEntry, LedgerResponse

router = APIRouter(prefix="/api/v1/ledger", tags=["ledger"])


@router.get("", response_model=LedgerResponse)
async def get_ledger(
    session: AsyncSession = Depends(get_db),
) -> LedgerResponse:
    result = await session.execute(select(func.count(RecoveryClaim.id)))
    total_claims = result.scalar() or 0

    result = await session.execute(
        select(func.coalesce(func.sum(RecoveryClaim.total_claim_amount), 0))
    )
    total_value = result.scalar() or 0

    # by supplier
    result = await session.execute(
        select(
            Invoice.supplier_name,
            func.count(Discrepancy.id),
            func.coalesce(func.sum(Discrepancy.difference_amount), 0),
        )
        .join(Discrepancy, Discrepancy.invoice_id == Invoice.id)
        .group_by(Invoice.supplier_name)
    )
    by_supplier_rows = result.all()

    # claims count per supplier
    claims_by_supplier = {}
    claim_count_result = await session.execute(
        select(
            Invoice.supplier_name,
            func.count(RecoveryClaim.id),
        )
        .join(RecoveryClaim, RecoveryClaim.invoice_id == Invoice.id)
        .group_by(Invoice.supplier_name)
    )
    for row in claim_count_result.all():
        claims_by_supplier[row[0]] = row[1]

    by_supplier = [
        LedgerEntry(
            supplier_name=row[0] or "Unknown",
            total_discrepancies=row[1] or 0,
            total_claim_value=float(row[2] or 0),
            claims_count=claims_by_supplier.get(row[0], 0),
        )
        for row in by_supplier_rows
    ]

    return LedgerResponse(
        total_claims=total_claims,
        total_claim_value=float(total_value),
        by_supplier=by_supplier,
    )
