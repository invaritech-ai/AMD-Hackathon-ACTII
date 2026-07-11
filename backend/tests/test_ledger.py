from __future__ import annotations

from decimal import Decimal

import pytest
from sqlalchemy import select

from claims_recovery.models.case_graph import Case, Claim, ClaimStatusEvent


@pytest.mark.asyncio
async def test_claim_persists_recovery_value_and_status_event(session):
    case = Case(title="Case 01")
    session.add(case)
    await session.flush()
    claim = Claim(
        case_id=case.id,
        total_amount=Decimal("2352.00"),
        currency="AUD",
    )
    session.add(claim)
    await session.flush()
    session.add(
        ClaimStatusEvent(
            claim_id=claim.id,
            from_status=None,
            to_status="draft",
            recovered_amount=Decimal("0.00"),
        )
    )
    await session.commit()

    stored = (
        await session.execute(select(Claim).where(Claim.id == claim.id))
    ).scalar_one()
    event = (await session.execute(select(ClaimStatusEvent))).scalar_one()
    assert stored.recovered_amount == Decimal("0.00")
    assert event.to_status == "draft"
