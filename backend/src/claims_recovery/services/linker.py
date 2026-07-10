"""Slice 3 — deterministic id linker + case graph.

The LLM extracted ids per document (slice 1). It does NOT decide what links to
what — this does, deterministically: normalise every id, union documents that
share one, and each connected component is a "case". Nodes = documents, edges =
a shared id. No LLM, no graph library — stdlib union-find over a token index.
"""

from __future__ import annotations

import re
from typing import Any


def normalize_id(value: Any) -> str:
    """Uppercase, alphanumerics only: 'INV-2231' / 'inv 2231' -> 'INV2231'.

    ponytail: exact match on the normalised token. This already absorbs
    separator/case variance (the common 'partial' case). True fuzzy match
    (edit distance) is slice 4 — add rapidfuzz then, not before.
    """
    return re.sub(r"[^A-Za-z0-9]", "", str(value or "")).upper()


def _doc_tokens(doc: dict[str, Any]) -> set[str]:
    return {t for v in (doc.get("ids") or {}).values() if (t := normalize_id(v))}


def build_graph(docs: list[dict[str, Any]]) -> dict[str, Any]:
    """Link documents by shared normalised ids into cases (components).

    `docs`: [{"id", "type", "filename", "ids": {field: value}}, ...].
    Returns {"nodes", "edges", "cases"} — ready for the graph frontend.
    """
    tokens = {d["id"]: _doc_tokens(d) for d in docs}

    # Token -> documents that carry it. A token shared by >=2 docs is a link.
    index: dict[str, list[str]] = {}
    for doc_id, toks in tokens.items():
        for t in toks:
            index.setdefault(t, []).append(doc_id)

    # Union-find over documents.
    parent = {d["id"]: d["id"] for d in docs}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]  # path halving
            x = parent[x]
        return x

    def union(a: str, b: str) -> None:
        parent[find(a)] = find(b)

    # Edges: one per document pair, carrying every id they share.
    edges: dict[tuple[str, str], set[str]] = {}
    for token, ids in index.items():
        if len(ids) < 2:
            continue
        for i in range(len(ids)):
            for j in range(i + 1, len(ids)):
                union(ids[i], ids[j])
                edges.setdefault(tuple(sorted((ids[i], ids[j]))), set()).add(token)

    # Components -> cases.
    comps: dict[str, list[str]] = {}
    for doc_id in parent:
        comps.setdefault(find(doc_id), []).append(doc_id)

    cases = [
        {
            "case_id": f"case-{n:02d}",
            "document_ids": sorted(members),
            "shared_ids": sorted(
                {t for m in members for t in tokens[m]}
                & {t for t, ids in index.items() if len(ids) > 1}
            ),
        }
        for n, members in enumerate(
            sorted(comps.values(), key=lambda m: (-len(m), sorted(m))), start=1
        )
    ]
    case_of = {d: c["case_id"] for c in cases for d in c["document_ids"]}

    nodes = [
        {
            "id": d["id"],
            "type": d.get("type"),
            "filename": d.get("filename"),
            "ids": sorted(tokens[d["id"]]),
            "case_id": case_of[d["id"]],
        }
        for d in docs
    ]
    edge_list = [
        {"source": a, "target": b, "shared_ids": sorted(vias)}
        for (a, b), vias in edges.items()
    ]
    return {"nodes": nodes, "edges": edge_list, "cases": cases}
