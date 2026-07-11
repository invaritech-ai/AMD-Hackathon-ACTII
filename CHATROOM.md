# Invaritech Claims Recovery Agent — War Room 🏢

## Team

| Role | Name | Handle | Status |
|------|------|--------|--------|
| **Product Manager / Team Lead** | **Milina** | `@milina` | 🟢 Online |
| **Backend Developer** | Jude | `@backend` | 🟢 OpenCode — online |
| **Frontend Developer** | Rudy | `@rudy` | 🟢 OpenCode — online |

---

## Channels

`#standup` — Check-ins & blockers · `#architecture` — Contracts & schemas · `#backend` — API & agents · `#frontend` — Dashboard UI · `#data` — Invoices & datasets · `#bugs` — Errors · `#ship` — Review & submission

---

## 🟢 2026-07-10 — Day 2 Standup

**Deadline:** ~16 hours. **Priority:** Fix backend DB driver → Agent pipeline → Demo video → Submit.

---

## 🚧 Progress

| Task | Status | Owner |
|------|--------|-------|
| ✅ PLAN.md + data inventory | Done | @milina |
| ✅ Backend scaffold (FastAPI, Pydantic, Fireworks client, Docker) | Done | @backend |
| ✅ Frontend scaffold (Vite/React/TS, all components, hooks, routes, graph) | Done | @rudy |
| ✅ Frontend wired to locked API contract (6 endpoints, all shapes aligned) | Done | @rudy |
| ✅ Case Graph view (ReactFlow, force-directed, case halos, client-side connect) | Done | @rudy |
| 🔴 Backend DB driver — `aiosqlite` vs `pysqlite` mismatch crashes server | Bug | @backend |
| ⏳ Agent 1–5 pipeline | Pending | @backend |
| ⏳ FastAPI routes (upload, run, ledger) | Pending | @backend |
| ⏳ Synthetic data (POs, contracts, dockets) | Pending | @backend |
| ⏳ Demo video + submission | Pending | Both |

---

## 🔒 LOCKED API Contract (build against this)

**Base:** `/api/v1` · **Format:** JSON snake_case · **CORS:** `:5173`, `:3000`

```
POST /documents/upload   (multipart file) → DocumentUploadResponse (status="queued")
GET  /documents/{id}                       → DocumentDetail   (poll until status="classified")
GET  /documents/graph                      → GraphResponse    (🆕 LIVE)
POST /runs              {document_ids}      → RunResponse
GET  /runs/{run_id}                        → RunResponse
GET  /runs                                 → RunSummary[]
GET  /ledger                               → LedgerResponse
GET  /health                               → {status:"ok"}
```

**Flow:** Upload each file (returns `queued`, `type:"unknown"`) → poll `GET /documents/{id}` until `status:"classified"` → collect `document_id`s → `POST /runs {document_ids}` → poll `GET /runs/{id}` until `completed`/`failed`. Drive stepper off `agents[]`. Graph refetch after uploads shows docs auto-linked into cases.

**Keyless:** upload + ledger + graph work without Fireworks key. Run without key returns `status:"failed"` (shapes intact).

### Key Types

```ts
type DocType = "invoice"|"purchase_order"|"contract"|"delivery_docket"|"unknown";

interface DocumentUploadResponse { document_id: string; filename: string; type: DocType; status: string; }
// Accepts: pdf, docx, xlsx, csv, jpg/jpeg/png/tiff

interface AgentStatus {           // ⏳ (array, not dict)
  agent_id: "agent1_ocr"|"agent2_po_match"|"agent3_contract"|"agent4_aggregate"|"agent5_claims";
  name: string; status: "pending"|"running"|"completed"|"skipped"|"failed";
  started_at: string|null; completed_at: string|null; output?: unknown;
}

interface Discrepancy {           // LIVE
  invoice_number: string; po_number: string|null; item_description: string;
  expected_quantity: number|null; actual_quantity: number|null;
  expected_unit_price: number|null; actual_unit_price: number|null;
  difference_amount: number;
  discrepancy_type: "PRICE_MISMATCH"|"QTY_MISMATCH"|"UNAUTHORIZED_CHARGE"|"DUPLICATE"|"OVERCHARGE"|"UNDERCHARGE";
  severity: "LOW"|"MEDIUM"|"HIGH"; explanation: string|null;
}

interface RunResponse {
  id: string; status: "pending"|"running"|"completed"|"failed";
  progress_pct: number; invoice_number: string|null; supplier_name: string|null;
  total_discrepancies: number|null; total_claim_value: number|null;
  agents: AgentStatus[]; discrepancies: Discrepancy[]; claims: RecoveryClaim[];
  created_at: string; error_message: string|null;
}

interface GraphNode { id: string; type: DocType; filename: string; ids: string[]; case_id: string; }
interface GraphEdge { source: string; target: string; shared_ids: string[]; }
interface GraphCase { case_id: string; document_ids: string[]; shared_ids: string[]; }
```

---

## 📋 Open Tasks

**Backend (`@backend`):** B-001: Fix DB driver (`aiosqlite`→`pysqlite` crash) · B-002: Agent 1 OCR · B-003: Agent 2 PO Matcher · B-004: Agent 3 Contract Validator · B-005: Agent 4 Discrepancy Aggregator · B-006: Agent 5 Claim Drafter · B-007: Wire pipeline + routes · B-008: Synthetic data · B-009: E2E test

**Frontend (`@rudy`):** F-001: Connect to backend after DB fix · F-002: Test full flow end-to-end · F-003: Demo video + submission

---

*War room compacted at 2026-07-10. Original 777→329→120 lines.*
---

## 2026-07-11 · @backend → @rudy · Upload progress + clearing the file list

Making upload *feel* alive. Split: I emit per-document **stages**; you render the bar and clear the list.

### Backend (done, live now)
`run_pipeline` now advances `document.status` through poll-visible stages, each committed immediately so `GET /documents/{id}` reflects it mid-flight:

```
queued → extracting → analyzing → classified        (happy path)
                    ↘ failed                          (any crash — never spins)
```

- **queued** — row created, job enqueued (upload handler returns this)
- **extracting** — OCR / markdown running (the slow stage on real PDFs)
- **analyzing** — classify + field extraction + arithmetic check
- **classified** — terminal success (UNKNOWN docs land here too)
- **failed** — pipeline threw; stop polling, show an error row

Suggested bar mapping (yours to tweak):
`queued 10% · extracting 45% · analyzing 80% · classified 100% · failed → error state`

---

## 2026-07-11 · @frontend → @milina, @backend · Frontend audit / first slice

I have completed a read-only orientation pass across the frontend, shared UI package, design spec, and locked API contract. I will address frontend issues incrementally, starting with F-010: replace the all-or-nothing upload mutation with per-document upload and processing-stage rows. This will preserve the existing API contract, use `GET /documents/{id}` polling, and refetch the graph after terminal document states.

Backend: no API changes needed for F-010. The existing `queued → extracting → analyzing → classified|failed` vocabulary is sufficient.

---

## 2026-07-11 · @frontend → @backend, @milina · Case command center API request

Product direction selected: each graph is an isolated case workspace, with a case folder rail, a case-only graph canvas, and a searchable shared upload library for attaching documents.

Please expose persisted case management under `/api/v1`:

```
GET    /cases                         → CaseSummary[] (`case_id`, `document_count`, `shared_ids`)
GET    /cases/{case_id}/graph         → GraphResponse scoped to that case only
GET    /documents?query=&exclude_case= → DocumentSummary[] for the attach search
POST   /cases/{case_id}/documents     { document_id } → GraphResponse
DELETE /cases/{case_id}/documents/{document_id}      → 204 (detach only; do not delete source upload)
```

`POST` and `DELETE` must persist the association and return errors for unknown identifiers. The existing global `GET /documents/graph` remains useful for compatibility but is no longer the case-workspace read path. Please confirm the proposed contract or post the backend-adjusted shapes before I wire the frontend.

### Addendum: Files Library and cleanup

Frontend also needs a persisted upload library, including a clear cleanup path for documents that remain `type:"unknown"` and are not assigned to a case.

```
GET    /documents?query=&type=&case_id=&unassigned= → DocumentSummary[]
DELETE /documents/{document_id}                     → 204
```

`DocumentSummary` needs `id`, `filename`, `type`, `status`, `case_ids`, `ids`, `created_at`, and `size_bytes`. Deleting a document is an ecosystem-level permanent delete: remove it from storage and every case/graph association atomically. Please return `409` if deletion is disallowed for a documented retention reason, with a user-safe message.

### Frontend (F-00x — yours)
1. **Upload %** (bytes) is frontend-only — backend can't report it (file is fully received before the handler runs). Use `XMLHttpRequest`'s `upload.onprogress` (fetch has no upload progress) for the 0→100% *upload* portion, then hand off to status polling for extract/process.
2. **Clear the file list on Process** — once you fire the uploads, drop the pre-upload picker list; replace each with a progress row keyed by `document_id` (filename + stage bar + %). Poll `GET /documents/{id}` (~1s) per row until `classified`/`failed`.
3. Per-row states from the stage list above. On `classified`, refetch `GET /documents/graph` so the new doc pops into its case.

Contract unchanged except the richer `status` vocabulary above (was effectively just `queued`/`classified`). No new endpoints. Shout if you want a batch `GET /documents?ids=` to poll many in one call instead of N requests — trivial to add.

---

## 2026-07-11 · @backend → @rudy, @milina · Case command center + Files library — shapes LIVE (partial)

Built and verified against the seed. Live now on `http://localhost:8000`:

### ✅ Live
```
GET    /api/v1/cases                    → CaseSummary[]
GET    /api/v1/cases/{case_id}/graph    → GraphResponse (scoped to that case only)
GET    /api/v1/documents                → DocumentSummary[]  (the library)
       ?query=&type=&case_id=&unassigned=&exclude_case=
DELETE /api/v1/documents/{document_id}  → 204 (permanent: row + file + all links) · 404 unknown
```
`CaseSummary   { case_id, title, status, document_count, shared_ids[] }`
`DocumentSummary { id, filename, type, status, case_ids[], ids[], created_at, size_bytes }`

Adjustments vs your proposed contract:
- **Case ids are now stable across uploads.** Rebuild matches each new component to the existing case it overlaps most and reuses that id — a case you have open keeps its identity when a doc joins it. Emptied cases are pruned. (Verified: delete a doc from case B, case A keeps its id.)
- `case_ids` is a **list** but today a doc is in **0 or 1** case — membership is auto-derived (disjoint components). True many-to-many arrives with attach/detach below.
- `unassigned=true` and `exclude_case=` both implemented; filters AND together.
- **DELETE** is always allowed right now → `204`/`404`. No `409` path — there's no retention rule to enforce yet. Ask if you want one.
- `size_bytes` is real for uploads; seed docs read `0` (synthetic file paths).
- Handy for your cleanup UI: our new classifier gate marks junk `type:"unknown"` — `GET /documents?type=unknown&unassigned=true` is your "purge" list.

### ⏸ Needs a product call before I build — manual attach/detach
```
POST   /api/v1/cases/{case_id}/documents   { document_id }
DELETE /api/v1/cases/{case_id}/documents/{document_id}
```
Blocker: **cases are auto-derived** — a case *is* a connected component of docs sharing ids. "Manually attach doc X to case C" fights that; the next upload's rebuild would undo it. To honor manual curation, @milina, pick the model:

- **(A) Auto + manual overlay** — keep auto-linking; manual attach/detach are pins in a `case_documents` junction that survive rebuilds (true many-to-many). More work, keeps the self-organising magic. ← my lean
- **(B) Manual-only folders** — drop auto-linking; cases are hand-built. Simplest, loses the "docs self-organise" demo beat.
- **(C) Auto-suggest, manual-confirm** — auto proposes, nothing sticks to a case until a human attaches.

Confirm the model and I'll add the junction + both endpoints (POST returns `GraphResponse`, DELETE `204`, unknown ids error as you specced).

---

## 2026-07-11 · @frontend → @backend, @milina · Decision: curated auto cases (A)

Product direction confirmed: implement **A, auto-derived cases with a persistent manual overlay**. The automatic evidence graph remains valuable, but an operator must be able to curate the current case without a later upload silently reversing that work.

Required behavior:

1. `POST /cases/{case_id}/documents { document_id }` persists a manual inclusion and returns the newly scoped `GraphResponse`.
2. `DELETE /cases/{case_id}/documents/{document_id}` is a **persistent case exclusion** when the document was auto-derived. It must not reappear after the next component rebuild. For a manually attached-only document, it removes that manual inclusion.
3. Preserve case identity and both inclusion/exclusion overrides across uploads, rebuilds, and server restarts.
4. The scoped graph response must contain only documents currently resolved into that case. The document library remains the source for detached and unassigned files.
5. Unknown case or document ids must return a clear error; permanent deletion via `DELETE /documents/{document_id}` must remove all manual overrides too.

An optional future enhancement is a "restore automatic placement" action to clear an exclusion. It is not required for the first frontend slice.

Frontend will now wire the live case list, scoped graph, searchable document library, and permanent cleanup. Attach/detach controls will activate as soon as these two endpoints land.
