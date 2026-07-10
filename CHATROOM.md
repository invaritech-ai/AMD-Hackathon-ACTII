# Invaritech Claims Recovery Agent — War Room 🏢

## Team

| Role | Name | Handle | Status |
|------|------|--------|--------|
| **Product Manager / Team Lead** | **Milina** | `@milina` | 🟢 Online |
| **Backend Developer** | Jude | `@backend` | 🟢 OpenCode — online |
| **Frontend Developer** | Rudy | `@rudy` | 🟢 OpenCode — online |

---

## Channels

- `#standup` — Daily check-ins, blockers, progress
- `#architecture` — Design decisions, schemas, contracts
- `#backend` — Agent code, FastAPI, data pipeline, DB
- `#frontend` — Dashboard UI, Vite + React + TS
- `#data` — Real invoices, synthetic datasets, schema
- `#bugs` — Issues, errors, debugging
- `#ship` — Ready for review, deployment, submission

---

## 🟢 2026-07-10 — Day 2 Standup

**Deadline:** ~16 hours. **Priority:** Agent pipeline → FastAPI wrapper → Dashboard → Demo video.

---

## Key Decisions Made (chronological)

| # | Decision | By | Notes |
|---|----------|----|-------|
| D1 | Stack: FastAPI + SQLite + Vite/React/TS + pnpm/Turborepo | Teams | Replaces original Streamlit/standalone plan |
| D2 | API contract: `POST /api/v1/documents/upload` → `POST /api/v1/runs` → `GET /api/v1/runs/{id}` (poll) | @backend + @rudy | Two-step flow (upload then run), chained internally by frontend |
| D3 | Agent models: Agent 2 → Llama 4 70B, Agent 3 → DeepSeek R1, Agent 5 → Llama 4 70B | @milina | Pending Fireworks key for cloud agents |
| D4 | Fallback: Agent 2 uses `rapidfuzz` when Fireworks unavailable | @milina | |
| D5 | Frontend design: Dark theme, Swiss-minimalist, Fira Sans + Fira Code, no glass/glow | @rudy | Professional enterprise aesthetic |
| D6 | Upload accept: PDF + DOCX + XLSX + CSV + images (jpg/png/tiff) | @backend | |
| D7 | `GET /api/v1/runs` → `RunSummary[]` for ledger | @backend | Agreed to add |
| D8 | `agents` field will be `AgentStatus[]` (array, not dict) | @backend | Frontend stepper maps 1:1 |
| D9 | Upload flow: frontend chains two-step internally (option A) | @milina + @rudy | User never sees document IDs |

---

## 🚧 Progress

| Task | Status | Owner |
|------|--------|-------|
| ✅ PLAN.md + project skeleton | Done | @milina |
| ✅ Data inventory (real invoices documented) | Done | @milina |
| ✅ Backend scaffold (FastAPI, SQLite, Pydantic models, Fireworks client) | Done | @backend |
| ✅ Frontend scaffold (Vite, React, TS, Tailwind, components, hooks, routes) | Done | @rudy |
| ✅ Frontend design refresh (minimalist, dark theme, toast system, proper states) | Done | @rudy |
| ✅ Locked API contract published | Done | @backend |
| ⏳ Agent 1: OCR Extractor | Pending | @backend |
| ⏳ Agent 2: PO Matcher | Pending | @backend |
| ⏳ Agent 3: Contract Validator | Pending | @backend |
| ⏳ Agent 4: Discrepancy Aggregator | Pending | @backend |
| ⏳ Agent 5: Claim Drafter | Pending | @backend |
| ⏳ FastAPI routes (upload, run, ledger) | Pending | @backend |
| ⏳ Synthetic data (POs, contracts, delivery dockets) | Pending | @backend |
| ⏳ Frontend API wiring (against locked contract) | Pending | @rudy |
| ⏳ Demo video + submission | Pending | Both |

---

## 🔒 LOCKED API Contract (build against this)

**Base path:** `/api/v1` | **Format:** JSON, snake_case | **CORS:** `:5173`, `:3000`

```
POST /api/v1/documents/upload   (multipart, one file)  -> DocumentUploadResponse
POST /api/v1/runs               {document_ids: string[]} -> RunResponse
GET  /api/v1/runs/{run_id}                               -> RunResponse
GET  /api/v1/runs                                        -> RunSummary[]     ⏳
GET  /api/v1/ledger                                      -> LedgerResponse
```

### Types
```ts
type DocType = "invoice"|"purchase_order"|"contract"|"delivery_docket"|"unknown";

interface DocumentUploadResponse {   // LIVE
  document_id: string; filename: string; type: DocType; status: string;
}
// Accepts: pdf, docx, xlsx, csv, jpg/jpeg/png/tiff

interface AgentStatus {              // ⏳ (array, not dict)
  agent_id: "agent1_ocr"|"agent2_po_match"|"agent3_contract"|"agent4_aggregate"|"agent5_claims";
  name: string; status: "pending"|"running"|"completed"|"skipped"|"failed";
  started_at: string|null; completed_at: string|null; output?: unknown;
}

interface Discrepancy {              // LIVE shape
  invoice_number: string; po_number: string|null; item_description: string;
  expected_quantity: number|null; actual_quantity: number|null;
  expected_unit_price: number|null; actual_unit_price: number|null;
  difference_amount: number;
  discrepancy_type: "PRICE_MISMATCH"|"QTY_MISMATCH"|"UNAUTHORIZED_CHARGE"|"DUPLICATE"|"OVERCHARGE"|"UNDERCHARGE";
  severity: "LOW"|"MEDIUM"|"HIGH"; explanation: string|null;
}

interface RecoveryClaim {            // ⏳ (claim_number/claim_date added)
  claim_number: string; invoice_number: string; po_number: string|null;
  total_claim_amount: number; draft_text: string|null;
  claim_date: string|null; status: "DRAFT"|"SUBMITTED"|"ACCEPTED"|"PAID";
}

interface RunResponse {
  id: string; status: "pending"|"running"|"completed"|"failed";
  progress_pct: number; invoice_number: string|null; supplier_name: string|null;
  total_discrepancies: number|null; total_claim_value: number|null;
  agents: AgentStatus[]; discrepancies: Discrepancy[]; claims: RecoveryClaim[];
  created_at: string; error_message: string|null;
}

interface RunSummary {               // ⏳ (for ledger/history)
  id: string; status: string; invoice_number: string|null; supplier_name: string|null;
  total_discrepancies: number|null; total_claim_value: number|null; created_at: string;
}

interface LedgerResponse {           // LIVE
  total_claims: number; total_claim_value: number;
  by_supplier: { supplier_name: string; total_discrepancies: number;
                 total_claim_value: number; claims_count: number; }[];
}
```

**Flow:** Upload each file → collect `document_id`s → `POST /runs {document_ids}` → **poll** `GET /runs/{id}` until `status` is `completed`/`failed`. Drive stepper off `agents[]`.

**Keyless today:** upload + ledger work without Fireworks key. Run without key returns `status:"failed"` with empty discrepancies/claims (shapes intact).

---

## 📋 Open Tasks

### Backend (`@backend`)
- **B-001:** Build Agent 1 (OCR Extractor) — pdf→text→structured JSON
- **B-002:** Build Agent 2 (PO Matcher) — fuzzy match + AMD Fireworks
- **B-003:** Build Agent 3 (Contract Validator) — AMD Fireworks pricing check
- **B-004:** Build Agent 4 (Discrepancy Aggregator) — local Python merge
- **B-005:** Build Agent 5 (Claim Drafter) — AMD Fireworks claim generation
- **B-006:** Wire agent pipeline + FastAPI routes (upload, run, ledger)
- **B-007:** Generate synthetic data (POs, contracts, delivery dockets)
- **B-008:** End-to-end test with real invoices

### Frontend (`@rudy`)
- **F-001:** Wire API client against locked contract (update `api.ts`, hooks, types)
- **F-002:** Connect UploadRoute to real backend (two-step flow chained internally)
- **F-003:** Connect DiscrepanciesRoute + ClaimsRoute to real data
- **F-004:** Connect LedgerRoute to `GET /api/v1/runs`
- **F-005:** End-to-end test against running backend
- **F-006:** Record demo video + prepare submission

---

## ⚠️ Pending Decisions / Blockers

| # | Question | Asked | Status |
|---|----------|-------|--------|
| P1 | Fireworks model names — config has `llama-v3p1-70b-instruct` (Llama 3.1). Should agents 2 & 5 use Llama 4? | @milina → @avi | 🔴 Waiting on user |
| P2 | Fireworks API key — backend needs `FIREWORKS_API_KEY` in `.env`. User has AMD credits from email. | @milina → @avi | 🔴 Waiting on user |

### Greenlit to proceed right now:
- Agent 1 (OCR) — purely local
- Agent 4 (Aggregator) — pure Python
- Agent 2 — can be built with `rapidfuzz` fallback first
- Frontend — all API wiring can be done against keyless backend (upload + ledger work)
- Synthetic data — PO/contract generation anytime

---

*War room compacted at 2026-07-10. Original 777 lines → 153 lines. Full session history preserved in session store.*