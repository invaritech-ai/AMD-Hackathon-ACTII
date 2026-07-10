"""Persist the linker's output into cases + doc_links.

The linker (`build_graph`) recomputes connected components from scratch; this
mirrors that into the DB so uploaded documents visibly self-organise into cases.
"""

from __future__ import annotations

import json

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from claims_recovery.models.case_graph import Case, DocLink
from claims_recovery.models.document import Document
from claims_recovery.services.linker import build_graph


async def rebuild_case_graph(session: AsyncSession) -> None:
    """Recompute cases + doc_links over all documents.

    ponytail: full delete-and-recreate. Correct and simple while a single worker
    runs and cases carry no claims yet. Make it incremental + per-case-locked
    when manual edits or claims attach, or when throughput matters.
    """
    docs = (await session.execute(select(Document))).scalars().all()
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

    # Clear derived rows: detach documents, drop links + cases.
    await session.execute(delete(DocLink))
    for d in docs:
        d.case_id = None
    await session.flush()
    await session.execute(delete(Case))
    await session.flush()

    by_id = {d.id: d for d in docs}
    case_by_label: dict[str, Case] = {}
    for c in graph["cases"]:
        case = Case(status="open")
        session.add(case)
        await session.flush()  # assign case.id
        case_by_label[c["case_id"]] = case
        for doc_id in c["document_ids"]:
            by_id[doc_id].case_id = case.id

    doc_case_label = {
        doc_id: c["case_id"] for c in graph["cases"] for doc_id in c["document_ids"]
    }
    for edge in graph["edges"]:
        a, b = sorted((edge["source"], edge["target"]))
        case = case_by_label[doc_case_label[edge["source"]]]
        for value_norm in edge["shared_ids"]:
            session.add(
                DocLink(
                    doc_a_id=a,
                    doc_b_id=b,
                    case_id=case.id,
                    value_norm=value_norm,
                    match_type="exact",
                    confidence=1.0,
                    origin="auto",
                    status="active",
                )
            )

    await session.commit()
