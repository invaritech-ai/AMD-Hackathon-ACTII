from __future__ import annotations

from collections import Counter
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from claims_recovery.models.case_graph import (
    Case,
    CaseException,
    Claim,
    ClaimStatusEvent,
    Reconciliation,
)
from claims_recovery.schemas.api import (
    LedgerCaseResponse,
    LedgerCurrencySummary,
    LedgerResponse,
    LedgerUpdateRequest,
)

FORWARD_TRANSITIONS: dict[str, set[str]] = {
    "draft": {"submitted"},
    "submitted": {"under_review"},
    "under_review": {"approved"},
    "approved": {"partially_recovered", "recovered"},
    "partially_recovered": {"recovered"},
    "recovered": set(),
    "rejected": set(),
    "written_off": set(),
}
TERMINAL_STATUSES = {"recovered", "rejected", "written_off"}
TERMINAL_ALTERNATIVES = {"rejected", "written_off"}


class LedgerNotFound(Exception):
    pass


class LedgerConflict(Exception):
    pass


async def ensure_claim_is_draft_or_absent(
    session: AsyncSession, case_id: str
) -> None:
    claim = (
        await session.execute(
            select(Claim).where(Claim.case_id == case_id).with_for_update()
        )
    ).scalar_one_or_none()
    if claim is not None and claim.status != "draft":
        raise LedgerConflict("Claim is locked after submission")


async def add_draft_claim(
    session: AsyncSession,
    *,
    case_id: str,
    total_amount: Decimal,
    currency: str | None,
    draft_text: str,
) -> Claim:
    claim = Claim(
        case_id=case_id,
        total_amount=total_amount,
        recovered_amount=Decimal("0"),
        currency=currency,
        draft_text=draft_text,
        status="draft",
    )
    session.add(claim)
    await session.flush()
    session.add(
        ClaimStatusEvent(
            claim_id=claim.id,
            from_status=None,
            to_status="draft",
            recovered_amount=Decimal("0"),
        )
    )
    return claim


async def get_case_ledger_row(
    session: AsyncSession, claim: Claim, case: Case
) -> LedgerCaseResponse:
    history = (
        await session.execute(
            select(ClaimStatusEvent)
            .where(ClaimStatusEvent.claim_id == claim.id)
            .order_by(ClaimStatusEvent.created_at, ClaimStatusEvent.id)
        )
    ).scalars().all()
    latest_reconciliation_id = (
        await session.execute(
            select(Reconciliation.id)
            .where(Reconciliation.case_id == case.id)
            .order_by(Reconciliation.created_at.desc(), Reconciliation.id.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    exception_count = 0
    if latest_reconciliation_id is not None:
        exception_count = (
            await session.execute(
                select(func.count(CaseException.id)).where(
                    CaseException.reconciliation_id == latest_reconciliation_id
                )
            )
        ).scalar_one()

    return LedgerCaseResponse(
        case_id=case.id,
        claim_id=claim.id,
        title=case.title,
        status=claim.status,
        currency=claim.currency or "UNKNOWN",
        claim_amount=claim.total_amount,
        recovered_amount=claim.recovered_amount,
        outstanding_amount=claim.total_amount - claim.recovered_amount,
        exception_count=exception_count,
        created_at=claim.created_at,
        updated_at=claim.updated_at,
        history=list(history),
    )


async def get_ledger(session: AsyncSession) -> LedgerResponse:
    records = (
        await session.execute(
            select(Claim, Case)
            .join(Case, Case.id == Claim.case_id)
            .order_by(Claim.updated_at.desc(), Claim.id.desc())
        )
    ).all()
    rows = [await get_case_ledger_row(session, claim, case) for claim, case in records]

    summaries: list[LedgerCurrencySummary] = []
    for currency in sorted({row.currency for row in rows}):
        currency_rows = [row for row in rows if row.currency == currency]
        total_claimed = sum(
            (row.claim_amount for row in currency_rows), start=Decimal("0")
        )
        total_recovered = sum(
            (row.recovered_amount for row in currency_rows), start=Decimal("0")
        )
        summaries.append(
            LedgerCurrencySummary(
                currency=currency,
                claim_count=len(currency_rows),
                total_claimed=total_claimed,
                total_recovered=total_recovered,
                total_outstanding=total_claimed - total_recovered,
                status_counts=dict(Counter(row.status for row in currency_rows)),
            )
        )

    return LedgerResponse(summaries=summaries, cases=rows)


async def update_case_ledger(
    session: AsyncSession, case_id: str, body: LedgerUpdateRequest
) -> LedgerCaseResponse:
    claim = (
        await session.execute(
            select(Claim).where(Claim.case_id == case_id).with_for_update()
        )
    ).scalar_one_or_none()
    if claim is None:
        raise LedgerNotFound("Case has no generated claim")

    current = claim.status
    if current in TERMINAL_STATUSES:
        raise LedgerConflict(f"Claim status '{current}' is terminal")
    allowed = FORWARD_TRANSITIONS.get(current)
    if allowed is None:
        raise LedgerConflict(f"Unsupported current claim status '{current}'")
    if body.status not in allowed | TERMINAL_ALTERNATIVES:
        raise LedgerConflict(f"Cannot transition claim from '{current}' to '{body.status}'")

    recovered_amount = claim.recovered_amount
    if body.status == "partially_recovered":
        requested = body.recovered_amount
        if requested is None or requested <= 0 or requested >= claim.total_amount:
            raise LedgerConflict(
                "Partial recovery must be greater than zero and less than the claim amount"
            )
        recovered_amount = requested
    elif body.status == "recovered":
        recovered_amount = claim.total_amount

    claim.status = body.status
    claim.recovered_amount = recovered_amount
    session.add(
        ClaimStatusEvent(
            claim_id=claim.id,
            from_status=current,
            to_status=body.status,
            recovered_amount=recovered_amount,
            note=body.note,
        )
    )
    await session.commit()
    await session.refresh(claim)
    case = await session.get(Case, case_id)
    if case is None:
        raise LedgerNotFound("Case has no generated claim")
    return await get_case_ledger_row(session, claim, case)
