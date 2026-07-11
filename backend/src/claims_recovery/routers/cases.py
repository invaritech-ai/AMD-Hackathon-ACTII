from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from claims_recovery.database import get_db
from claims_recovery.models.case_graph import (
    Case,
    CaseException,
    CaseMembershipOverride,
    Claim,
    DocLink,
    Reconciliation,
)
from claims_recovery.models.document import Document
from claims_recovery.schemas.api import (
    CaseSummary,
    GraphResponse,
    ReconciliationResponse,
)
from claims_recovery.services.case_graph_service import rebuild_case_graph
from claims_recovery.services.linker import build_graph
from claims_recovery.services.ledger import LedgerConflict
from claims_recovery.services.reconciliation import reconcile_case
from claims_recovery.services.triage import has_remittance, triage_case

router = APIRouter(prefix="/api/v1/cases", tags=["cases"])


class AttachRequest(BaseModel):
    document_id: str


async def _scoped_graph(session: AsyncSession, case_id: str) -> GraphResponse:
    """Graph of exactly the documents currently resolved into `case_id`."""
    docs = (
        await session.execute(select(Document).where(Document.case_id == case_id))
    ).scalars().all()
    payload = build_graph(
        [
            {
                "id": d.id,
                "type": d.type.value,
                "filename": d.original_filename,
                "ids": (json.loads(d.extracted_json).get("ids") if d.extracted_json else {}) or {},
            }
            for d in docs
        ]
    )
    return GraphResponse.model_validate(payload)


async def _set_override(
    session: AsyncSession, case_id: str, document_id: str, kind: str
) -> None:
    """Upsert exactly one override row per (case, doc); `kind` flips include/exclude."""
    existing = (
        await session.execute(
            select(CaseMembershipOverride).where(
                CaseMembershipOverride.case_id == case_id,
                CaseMembershipOverride.document_id == document_id,
            )
        )
    ).scalar_one_or_none()
    if existing is None:
        session.add(
            CaseMembershipOverride(case_id=case_id, document_id=document_id, kind=kind)
        )
    else:
        existing.kind = kind
    await session.flush()


@router.get("", response_model=list[CaseSummary])
async def list_cases(session: AsyncSession = Depends(get_db)) -> list[CaseSummary]:
    """All persisted cases with document counts and the ids that bind them."""
    counts = dict(
        (
            await session.execute(
                select(Document.case_id, func.count())
                .where(Document.case_id.is_not(None))
                .group_by(Document.case_id)
            )
        ).all()
    )
    # Shared ids per case (distinct link values).
    shared: dict[str, list[str]] = {}
    for case_id, value_norm in (
        await session.execute(
            select(DocLink.case_id, DocLink.value_norm).distinct()
        )
    ).all():
        shared.setdefault(case_id, []).append(value_norm)

    cases = (await session.execute(select(Case))).scalars().all()
    return [
        CaseSummary(
            case_id=c.id,
            title=c.title,
            status=c.status,
            document_count=counts.get(c.id, 0),
            shared_ids=sorted(shared.get(c.id, [])),
        )
        for c in cases
    ]


@router.get("/{case_id}/graph", response_model=GraphResponse)
async def case_graph(
    case_id: str, session: AsyncSession = Depends(get_db)
) -> GraphResponse:
    """Graph scoped to one case: its documents, their links, that single case."""
    if await session.get(Case, case_id) is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return await _scoped_graph(session, case_id)


@router.post("/{case_id}/documents", response_model=GraphResponse)
async def attach_document(
    case_id: str,
    body: AttachRequest,
    session: AsyncSession = Depends(get_db),
) -> GraphResponse:
    """Manually pin a document into a case (survives rebuilds). Returns scoped graph."""
    if await session.get(Case, case_id) is None:
        raise HTTPException(status_code=404, detail="Case not found")
    if await session.get(Document, body.document_id) is None:
        raise HTTPException(status_code=404, detail="Document not found")

    await _set_override(session, case_id, body.document_id, "include")
    await rebuild_case_graph(session)  # applies the pin, returns committed state
    return await _scoped_graph(session, case_id)


@router.delete("/{case_id}/documents/{document_id}", status_code=204)
async def detach_document(
    case_id: str,
    document_id: str,
    session: AsyncSession = Depends(get_db),
) -> Response:
    """Detach a document from a case: a persistent exclusion that outlives rebuilds."""
    if await session.get(Case, case_id) is None:
        raise HTTPException(status_code=404, detail="Case not found")
    if await session.get(Document, document_id) is None:
        raise HTTPException(status_code=404, detail="Document not found")

    await _set_override(session, case_id, document_id, "exclude")
    await rebuild_case_graph(session)
    return Response(status_code=204)


async def _recon_response(session: AsyncSession, case_id: str) -> ReconciliationResponse:
    """Latest reconciliation for a case: its exceptions + the current claim."""
    recon = (
        await session.execute(
            select(Reconciliation)
            .where(Reconciliation.case_id == case_id)
            .order_by(Reconciliation.created_at.desc())
        )
    ).scalars().first()
    if recon is None:
        return ReconciliationResponse(case_id=case_id, status="ok", summary="Not yet reconciled.")

    exceptions = (
        await session.execute(
            select(CaseException).where(CaseException.reconciliation_id == recon.id)
        )
    ).scalars().all()
    claim = (
        await session.execute(select(Claim).where(Claim.case_id == case_id))
    ).scalars().first()

    return ReconciliationResponse(
        case_id=case_id,
        reconciliation_id=recon.id,
        status=recon.status,
        summary=recon.summary,
        total_recoverable=claim.total_amount if claim else 0,
        currency=claim.currency if claim else None,
        exceptions=list(exceptions),
        claim=claim,
    )


@router.post("/{case_id}/reconcile", response_model=ReconciliationResponse)
async def run_reconciliation(
    case_id: str, session: AsyncSession = Depends(get_db)
) -> ReconciliationResponse:
    """Run the deterministic checks over a case; persist + return.

    Dispatches on evidence: a case with a retailer remittance advice is triaged
    deduction-by-deduction (claims-desk); otherwise we fall back to the
    invoice-vs-PO reconciliation.
    """
    if await session.get(Case, case_id) is None:
        raise HTTPException(status_code=404, detail="Case not found")
    docs = (
        await session.execute(select(Document).where(Document.case_id == case_id))
    ).scalars().all()
    try:
        if has_remittance(docs):
            await triage_case(session, case_id)
        else:
            await reconcile_case(session, case_id)
    except LedgerConflict as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return await _recon_response(session, case_id)


@router.get("/{case_id}/reconciliation", response_model=ReconciliationResponse)
async def get_reconciliation(
    case_id: str, session: AsyncSession = Depends(get_db)
) -> ReconciliationResponse:
    """Read the latest reconciliation result for a case (no recompute)."""
    if await session.get(Case, case_id) is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return await _recon_response(session, case_id)
