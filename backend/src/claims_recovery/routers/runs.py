from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from claims_recovery.database import get_db
from claims_recovery.models.discrepancy import Discrepancy
from claims_recovery.models.pipeline_run import PipelineRun, RunStatus
from claims_recovery.models.recovery_claim import RecoveryClaim
from claims_recovery.schemas.api import RunCreateRequest, RunResponse
from claims_recovery.services.pipeline_service import execute_pipeline

router = APIRouter(prefix="/api/v1/runs", tags=["runs"])


@router.post("", response_model=RunResponse)
async def create_run(
    body: RunCreateRequest,
    session: AsyncSession = Depends(get_db),
) -> RunResponse:
    run = PipelineRun(
        status=RunStatus.PENDING,
        document_ids=json.dumps(body.document_ids),
    )
    session.add(run)
    await session.commit()
    await session.refresh(run)

    run = await execute_pipeline(session, run)

    await session.refresh(run)
    return _build_run_response(run)


@router.get("/{run_id}", response_model=RunResponse)
async def get_run(
    run_id: str,
    session: AsyncSession = Depends(get_db),
) -> RunResponse:
    run = await session.get(PipelineRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    result = await session.execute(
        select(Discrepancy).where(Discrepancy.run_id == run_id)
    )
    discrepancies = result.scalars().all()

    claim_result = await session.execute(
        select(RecoveryClaim).where(RecoveryClaim.run_id == run_id)
    )
    claims = claim_result.scalars().all()

    return _build_run_response(run, list(discrepancies), list(claims))


def _build_run_response(
    run: PipelineRun,
    discrepancies: list[Discrepancy] | None = None,
    claims: list[RecoveryClaim] | None = None,
) -> RunResponse:
    agents = {}
    progress_pct = 0.0
    steps = 5

    if run.agent1_ocr:
        agents["agent1_ocr"] = json.loads(run.agent1_ocr)
        progress_pct += 100 / steps
    if run.agent2_po_match:
        agents["agent2_po_match"] = json.loads(run.agent2_po_match)
        progress_pct += 100 / steps
    if run.agent3_contract:
        agents["agent3_contract"] = json.loads(run.agent3_contract)
        progress_pct += 100 / steps
    if run.agent4_aggregate:
        agents["agent4_aggregate"] = json.loads(run.agent4_aggregate)
        progress_pct += 100 / steps
    if run.agent5_claims:
        agents["agent5_claims"] = json.loads(run.agent5_claims)
        progress_pct += 100 / steps

    return RunResponse(
        id=run.id,
        status=run.status.value if isinstance(run.status, RunStatus) else run.status,
        progress_pct=min(progress_pct, 100.0),
        total_discrepancies=run.total_discrepancies,
        total_claim_value=run.total_claim_value,
        agents=agents,
        discrepancies=[
            {
                "invoice_number": d.invoice_number,
                "po_number": d.po_number,
                "item_description": d.item_description,
                "expected_quantity": d.expected_quantity,
                "actual_quantity": d.actual_quantity,
                "expected_unit_price": d.expected_unit_price,
                "actual_unit_price": d.actual_unit_price,
                "difference_amount": d.difference_amount,
                "discrepancy_type": d.discrepancy_type.value if d.discrepancy_type else "",
                "severity": d.severity.value if d.severity else "",
                "explanation": d.explanation,
            }
            for d in (discrepancies or [])
        ],
        claims=[
            {
                "invoice_number": c.invoice_number,
                "po_number": c.po_number,
                "total_claim_amount": c.total_claim_amount,
                "draft_text": c.draft_text,
                "status": c.status,
            }
            for c in (claims or [])
        ],
        created_at=run.created_at,
    )
