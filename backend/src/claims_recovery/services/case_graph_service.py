"""Persist the linker's output into cases + doc_links.

The linker (`build_graph`) recomputes connected components from scratch; this
mirrors that into the DB so uploaded documents visibly self-organise into cases.
"""

from __future__ import annotations

import json

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from claims_recovery.models.case_graph import Case, CaseMembershipOverride, DocLink
from claims_recovery.models.document import Document
from claims_recovery.services.linker import build_graph


async def rebuild_case_graph(session: AsyncSession) -> None:
    """Recompute cases + doc_links over all documents, keeping case ids stable.

    Components are recomputed from scratch, but each is matched to the existing
    case it overlaps most (by shared document membership) and reuses that case's
    id — so a case a user has open in the UI keeps its identity when a new
    document joins it. Only genuinely new components mint a new case; emptied
    cases are deleted.

    ponytail: doc_links are still fully rebuilt (auto only). Preserve manual
    links + a case_documents junction when manual attach/detach lands.
    """
    docs = (await session.execute(select(Document))).scalars().all()
    by_id = {d.id: d for d in docs}
    graph = build_graph(
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

    # Every existing case, and its current document members (before we detach).
    all_case_ids = set((await session.execute(select(Case.id))).scalars().all())
    existing_members: dict[str, set[str]] = {}
    for d in docs:
        if d.case_id:
            existing_members.setdefault(d.case_id, set()).add(d.id)

    # Links are always rebuilt; drop them and detach every document first.
    await session.execute(delete(DocLink))
    for d in docs:
        d.case_id = None
    await session.flush()

    # Match each new component to the existing case it overlaps most (stable id).
    # Largest components first so the biggest membership wins a contested id.
    claimed: set[str] = set()
    label_to_case_id: dict[str, str] = {}
    for c in sorted(graph["cases"], key=lambda c: -len(c["document_ids"])):
        members = set(c["document_ids"])
        best_id, best_overlap = None, 0
        for case_id, prev in existing_members.items():
            if case_id in claimed:
                continue
            overlap = len(members & prev)
            if overlap > best_overlap:
                best_id, best_overlap = case_id, overlap
        if best_id is not None:
            claimed.add(best_id)
            case_id = best_id
        else:
            case = Case(status="open")
            session.add(case)
            await session.flush()  # assign case.id
            case_id = case.id
        label_to_case_id[c["case_id"]] = case_id
        for doc_id in members:
            by_id[doc_id].case_id = case_id

    # Operator overrides win over auto placement (Model A). Excludes tombstone a
    # doc out of a case; includes pin it in. A case kept alive only by an include
    # must survive the prune below.
    overrides = (
        await session.execute(select(CaseMembershipOverride))
    ).scalars().all()
    for ov in overrides:
        doc = by_id.get(ov.document_id)
        if doc is None or ov.case_id not in all_case_ids:
            continue
        if ov.kind == "exclude":
            if doc.case_id == ov.case_id:
                doc.case_id = None
        elif ov.kind == "include":
            doc.case_id = ov.case_id

    # Prune by *final* membership: a case with no live members is gone — this
    # also catches a case whose sole doc was just pinned into another case.
    live_cases = {d.case_id for d in docs if d.case_id is not None}
    stale = all_case_ids - live_cases
    if stale:
        await session.execute(delete(Case).where(Case.id.in_(stale)))
    await session.flush()

    for edge in graph["edges"]:
        a, b = sorted((edge["source"], edge["target"]))
        # Only keep an edge whose endpoints still resolve into the same case;
        # an exclude/include override can split a raw component apart.
        case_id = by_id[a].case_id
        if case_id is None or case_id != by_id[b].case_id:
            continue
        for value_norm in edge["shared_ids"]:
            session.add(
                DocLink(
                    doc_a_id=a,
                    doc_b_id=b,
                    case_id=case_id,
                    value_norm=value_norm,
                    match_type="exact",
                    confidence=1.0,
                    origin="auto",
                    status="active",
                )
            )

    await session.commit()
