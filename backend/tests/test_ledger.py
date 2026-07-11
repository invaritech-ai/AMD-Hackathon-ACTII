from __future__ import annotations

from datetime import datetime
from decimal import Decimal

import pytest
from sqlalchemy import select

from claims_recovery.models.case_graph import (
    Case,
    CaseException,
    Claim,
    ClaimStatusEvent,
    Reconciliation,
)


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


@pytest.mark.asyncio
async def test_empty_ledger_returns_empty_arrays(client):
    response = await client.get("/api/v1/ledger")

    assert response.status_code == 200
    assert response.json() == {"summaries": [], "cases": []}


@pytest.mark.asyncio
async def test_ledger_lists_claim_cases_and_separates_currencies(client, session):
    aud_case = Case(title="AUD Case")
    hkd_case = Case(title="HKD Case")
    claimless = Case(title="No Claim")
    session.add_all([aud_case, hkd_case, claimless])
    await session.flush()
    session.add_all(
        [
            Claim(
                case_id=aud_case.id,
                total_amount=Decimal("2352.00"),
                recovered_amount=Decimal("1000.00"),
                currency="AUD",
                status="partially_recovered",
            ),
            Claim(
                case_id=hkd_case.id,
                total_amount=Decimal("14000.00"),
                recovered_amount=Decimal("0.00"),
                currency="HKD",
                status="draft",
            ),
        ]
    )
    await session.commit()

    response = await client.get("/api/v1/ledger")

    assert response.status_code == 200
    body = response.json()
    assert {row["title"] for row in body["cases"]} == {"AUD Case", "HKD Case"}
    assert [summary["currency"] for summary in body["summaries"]] == ["AUD", "HKD"]
    assert body["summaries"][0] == {
        "currency": "AUD",
        "claim_count": 1,
        "total_claimed": "2352.00",
        "total_recovered": "1000.00",
        "total_outstanding": "1352.00",
        "status_counts": {"partially_recovered": 1},
    }


@pytest.mark.asyncio
async def test_ledger_case_includes_latest_exceptions_and_ordered_history(
    client, session
):
    case = Case(title="AUD Case")
    session.add(case)
    await session.flush()
    claim = Claim(
        case_id=case.id,
        total_amount=Decimal("2352.00"),
        recovered_amount=Decimal("1000.00"),
        currency="AUD",
        status="partially_recovered",
    )
    session.add(claim)
    await session.flush()
    old_reconciliation = Reconciliation(
        case_id=case.id,
        status="exceptions_found",
        created_at=datetime(2026, 7, 10),
    )
    latest_reconciliation = Reconciliation(
        case_id=case.id,
        status="exceptions_found",
        created_at=datetime(2026, 7, 11),
    )
    session.add(old_reconciliation)
    await session.flush()
    session.add(latest_reconciliation)
    await session.flush()
    session.add_all(
        [
            CaseException(
                case_id=case.id,
                reconciliation_id=old_reconciliation.id,
                check_type="old",
                status="open",
            ),
            CaseException(
                case_id=case.id,
                reconciliation_id=latest_reconciliation.id,
                check_type="short_delivery",
                status="missing_proof",
            ),
            CaseException(
                case_id=case.id,
                reconciliation_id=latest_reconciliation.id,
                check_type="shrinkage",
                status="prohibited",
            ),
                ClaimStatusEvent(
                    claim_id=claim.id,
                    from_status=None,
                    to_status="draft",
                    recovered_amount=Decimal("0.00"),
                    created_at=datetime(2026, 7, 10),
                ),
        ]
    )
    await session.flush()
    session.add(
        ClaimStatusEvent(
            claim_id=claim.id,
            from_status="approved",
            to_status="partially_recovered",
            recovered_amount=Decimal("1000.00"),
            created_at=datetime(2026, 7, 11),
        )
    )
    await session.commit()

    response = await client.get("/api/v1/ledger")

    assert response.status_code == 200
    row = response.json()["cases"][0]
    assert row["exception_count"] == 2
    assert [event["to_status"] for event in row["history"]] == [
        "draft",
        "partially_recovered",
    ]
    assert row["outstanding_amount"] == "1352.00"


async def _claim_for_status(session, status: str = "draft") -> tuple[Case, Claim]:
    case = Case(title="Lifecycle Case")
    session.add(case)
    await session.flush()
    claim = Claim(
        case_id=case.id,
        total_amount=Decimal("2352.00"),
        recovered_amount=Decimal("0.00"),
        currency="AUD",
        status=status,
    )
    session.add(claim)
    await session.commit()
    return case, claim


@pytest.mark.asyncio
async def test_valid_status_transition_records_history(client, session):
    case, _ = await _claim_for_status(session)

    response = await client.patch(
        f"/api/v1/cases/{case.id}/ledger",
        json={"status": "submitted", "note": "Sent to retailer"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "submitted"
    assert body["history"][-1]["from_status"] == "draft"
    assert body["history"][-1]["to_status"] == "submitted"
    assert body["history"][-1]["note"] == "Sent to retailer"


@pytest.mark.asyncio
async def test_invalid_status_jump_returns_conflict(client, session):
    case, _ = await _claim_for_status(session)

    response = await client.patch(
        f"/api/v1/cases/{case.id}/ledger", json={"status": "approved"}
    )

    assert response.status_code == 409


@pytest.mark.asyncio
async def test_unknown_case_ledger_returns_not_found(client):
    response = await client.patch(
        "/api/v1/cases/unknown/ledger", json={"status": "submitted"}
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Case has no generated claim"}


@pytest.mark.asyncio
async def test_case_without_claim_returns_not_found(client, session):
    case = Case(title="Claimless Case")
    session.add(case)
    await session.commit()

    response = await client.patch(
        f"/api/v1/cases/{case.id}/ledger", json={"status": "submitted"}
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Case has no generated claim"}


@pytest.mark.asyncio
async def test_partial_and_full_recovery_amount_rules(client, session):
    case, _ = await _claim_for_status(session, status="approved")

    for amount in (None, "0.00", "2352.00"):
        payload = {"status": "partially_recovered"}
        if amount is not None:
            payload["recovered_amount"] = amount
        rejected = await client.patch(
            f"/api/v1/cases/{case.id}/ledger", json=payload
        )
        assert rejected.status_code == 409

    partial = await client.patch(
        f"/api/v1/cases/{case.id}/ledger",
        json={"status": "partially_recovered", "recovered_amount": "1000.00"},
    )
    assert partial.status_code == 200
    assert partial.json()["recovered_amount"] == "1000.00"
    assert partial.json()["outstanding_amount"] == "1352.00"

    recovered = await client.patch(
        f"/api/v1/cases/{case.id}/ledger", json={"status": "recovered"}
    )
    assert recovered.status_code == 200
    assert recovered.json()["recovered_amount"] == "2352.00"
    assert recovered.json()["outstanding_amount"] == "0.00"


@pytest.mark.asyncio
async def test_terminal_claim_cannot_transition(client, session):
    case, _ = await _claim_for_status(session, status="written_off")

    response = await client.patch(
        f"/api/v1/cases/{case.id}/ledger", json={"status": "recovered"}
    )

    assert response.status_code == 409
