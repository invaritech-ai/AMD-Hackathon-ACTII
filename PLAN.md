# Invaritech Claims Recovery Agent
## AMD Developer Hackathon Act-II — Unicorn Track

---

## 1. Problem Statement

**FMCG retailers lose millions annually to unrecovered claims.**  
Every shipment involves a chain of documents: Purchase Orders → Supplier Invoices → Delivery Dockets → Pricing Contracts.  
Discrepancies between these documents (wrong pricing, short-delivered quantities, missed rebates, duplicate billing) are:

- **Manual to detect** — a human must cross-reference 3-4 documents per claim
- **Easy to miss** — high-volume retailers process thousands of invoices monthly
- **Expensive to recover** — most claims under $500 are written off because recovery costs exceed the claim value

**Result:** Up to 2-5% of invoice value is lost to unrecovered discrepancies annually.

---

## 2. Solution

### Multi-Agent Claims Recovery System

A pipeline of specialized AI agents that:

1. **Ingest** — Scan and extract structured data from supplier invoices (PDF/image)
2. **Cross-Reference** — Match invoice line items against Purchase Orders, Delivery Dockets, and Pricing Contracts
3. **Flag Discrepancies** — Identify price mismatches, quantity over-billing, missing rebates, duplicate charges
4. **Draft Claims** — Generate professionally formatted recovery claim documents
5. **Track** — Maintain a ledger of claims submitted, recovered, and pending

### Architecture

```
                    ┌─────────────────┐
                    │   User Uploads  │
                    │  Invoice PDF(s) │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Agent 1: OCR   │  ← LOCAL (pytesseract / AMD ROCm OCR)
                    │  & Extraction   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Agent 2: PO    │  ← AMD Fireworks (Llama 4 70B)
                    │  Matcher        │     Cross-references invoice vs PO
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Agent 3:       │  ← AMD Fireworks (DeepSeek R1)
                    │  Contract       │     Validates pricing against contract
                    │  Validator      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Agent 4:       │  ← LOCAL (aggregation logic)
                    │  Discrepancy    │     Collects all mismatches
                    │  Aggregator     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Agent 5:       │  ← AMD Fireworks (Llama 4 70B)
                    │  Claim Drafter  │     Generates recovery claim PDF
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  FastAPI        │  ← HTTP wrapper over agent pipeline
                    │  (apps/api)     │     POST /api/upload, GET /runs/{id}/*
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Vite + React   │  ← Demo dashboard
                    │  (apps/web)     │     Upload, discrepancies, claims, ledger
                    └─────────────────┘
```

### Hybrid Inference Strategy

| Component | Backend | Rationale |
|-----------|---------|-----------|
| OCR/Image Extraction | **Local** (pytesseract + AMD ROCm) | No API cost, privacy for sensitive docs, fast |
| PO Matching | **AMD Fireworks** (Llama 4 70B) | Needs reasoning about fuzzy matches |
| Contract Validation | **AMD Fireworks** (DeepSeek R1) | Needs structured reasoning + pricing math |
| Discrepancy Aggregation | **Local** (Python logic) | Pure data aggregation, no LLM needed |
| Claim Drafting | **AMD Fireworks** (Llama 4 70B) | Needs natural language generation |
| Dashboard | **Vite + React + TS** (`apps/web`) | Real component model, reusable UI package, demo-grade polish |

**Why hybrid:** Showcases AMD's ecosystem breadth — both local ROCm GPU acceleration AND Fireworks cloud inference. Judges see full AMD stack utilization.

**Frontend↔Backend bridge:** A FastAPI service (`apps/api`) wraps the agent pipeline as HTTP endpoints. The Vite dashboard (`apps/web`) calls these via a typed fetch client + TanStack Query. Live pipeline status is surfaced by polling `GET /api/runs/{id}/status`.

---

## 3. Documents Needed

### Reference Data (used by the demo)

| Doc Type | Have? | Source | Notes |
|----------|-------|--------|-------|
| Supplier Invoices | ✅ YES | `~/Downloads/inv-00009.pdf` through `inv-00016.pdf` (8 sequential invoices) | Real vendor invoices. Will serve as the primary input |
| Supplier Invoices | ✅ YES | `~/Downloads/01_Finance/` Enclave Studios, Xata, Wrapped Punks invoices | Backup/alternative invoices |
| Food Supply Invoice | ✅ YES | `~/Downloads/11032026_Delivery Address Invoice Date Zampa Fish...pdf` | FMCG-relevant! Fish/chips supply chain |
| Invoice CSV Schema | ✅ YES | `~/Downloads/invoice_summary.csv`, `invoice_items.csv` | Proves the data model exists |
| Purchase Orders | ❌ NEED | Synthetic generation | 5-10 POs that reference the real invoice numbers |
| Pricing Contracts | ❌ NEED | Synthetic generation | 2-3 contracts with negotiated rates |
| Delivery Dockets | ❌ NEED | Synthetic generation | 3-5 delivery notes matching PO items |
| Claim Templates | ❌ NEED | Synthetic generation | 1-2 recovery claim templates |
| Retailer Rules | ❌ NEED | Synthetic generation | 1 document describing claim rules (e.g., Woolworths/Coles terms) |

### Synthetic Document Strategy

**Why synthetic is OK for this demo:**
- The **core documents** (invoices) are REAL — that's the impressive part
- Supporting docs (POs, contracts) are helper data that any real retailer would have in their ERP
- The demo's value is in the **cross-referencing logic**, not the authenticity of POs
- Synthetic docs are generated as simple JSON/CSV, not forged PDFs — transparent about what's real vs synthetic

---

## 4. Project Structure

```
~/Documents/Projects/Hackathon/                    ← Monorepo root
├── PLAN.md                                        ← This file
├── CHATROOM.md                                    ← Team war room log
├── pnpm-workspace.yaml                            ← pnpm workspaces config
├── turbo.json                                     ← Turborepo pipeline config
├── package.json                                   ← Root scripts (dev, build, lint)
├── data/
│   ├── invoices/                                  ← Real invoices (copied/linked from Downloads)
│   │   ├── inv-00009.pdf
│   │   ├── inv-00010.pdf
│   │   ├── ...
│   │   ├── inv-00016.pdf
│   │   └── zampa-fish-delivery.pdf                ← FMCG-relevant
│   ├── synthetic/                                 ← Generated reference data
│   │   ├── generate.py
│   │   ├── purchase_orders.csv
│   │   ├── contracts.json
│   │   ├── delivery_dockets.csv
│   │   ├── retailer_rules.md
│   │   └── claim_templates/
│   └── schema/
│       └── data_model.md                          ← Document field definitions
├── agents/                                        ← Python agent pipeline
│   ├── agent1_ocr_extractor.py                    ← LOCAL: OCR + structured extraction
│   ├── agent2_po_matcher.py                       ← AMD Fireworks: match invoice↔PO
│   ├── agent3_contract_validator.py               ← AMD Fireworks: validate pricing
│   ├── agent4_discrepancy_aggregator.py           ← LOCAL: compile all mismatches
│   └── agent5_claim_drafter.py                    ← AMD Fireworks: generate claim doc
├── core/                                          ← Shared Python utilities
│   ├── document_loader.py                         ← PDF loading + text extraction
│   ├── fireworks_client.py                        ← AMD Fireworks API wrapper
│   ├── data_models.py                             ← Pydantic models for all entities
│   └── config.py                                  ← API keys, model names, paths
├── apps/                                          ← Monorepo applications
│   ├── api/                                       ← FastAPI wrapper over agents
│   │   ├── main.py                                ← App entry, CORS, router mount
│   │   ├── routers/
│   │   │   ├── upload.py                          ← POST /api/upload
│   │   │   ├── runs.py                            ← GET /api/runs/{id}/{status,discrepancies,claims}
│   │   │   └── ledger.py                          ← GET /api/ledger
│   │   ├── services/
│   │   │   └── pipeline.py                        ← Orchestrates agents 1→5 per run
│   │   ├── store/
│   │   │   └── runs.py                            ← In-memory run registry (swap for Redis later)
│   │   ├── schemas.py                             ← API response Pydantic models
│   │   └── pyproject.toml
│   └── web/                                       ← Vite + React + TS dashboard
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── routes/
│           │   ├── UploadRoute.tsx                 ← Upload + live pipeline status
│           │   ├── DiscrepanciesRoute.tsx          ← Table + drill-down
│           │   ├── ClaimsRoute.tsx                ← Claim draft viewer
│           │   └── LedgerRoute.tsx                ← Recovery ledger dashboard
│           ├── components/
│           │   ├── UploadPanel.tsx
│           │   ├── PipelineStepper.tsx
│           │   ├── DiscrepancyTable.tsx
│           │   ├── DiscrepancyDetail.tsx
│           │   ├── ClaimPreview.tsx
│           │   ├── LedgerStats.tsx
│           │   ├── SupplierBreakdown.tsx
│           │   └── ClaimTimeline.tsx
│           ├── hooks/
│           │   ├── useUpload.ts
│           │   ├── useRunStatus.ts
│           │   ├── useDiscrepancies.ts
│           │   ├── useClaims.ts
│           │   └── useLedger.ts
│           ├── store/                             ← Zustand UI state
│           │   └── uiStore.ts
│           ├── lib/
│           │   ├── api.ts                         ← Typed API client (fetch wrapper)
│           │   └── queryClient.ts                 ← TanStack Query client
│           └── assets/
├── packages/
│   └── ui/                                        ← Shared component library (shadcn-style)
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── components/                        ← Button, Card, Table, Badge, Dialog, Tabs, Stepper, etc.
│           ├── lib/utils.ts                       ← cn() class merge helper
│           └── index.ts                           ← Barrel exports
├── tests/
│   ├── test_agent1.py
│   ├── test_agent2.py
│   ├── ...
│   ├── test_pipeline.py                           ← End-to-end integration test
│   └── web/
│       └── (Vitest specs colocated or here)
├── requirements.txt                               ← Python deps for agents/core/api
├── .env.example
└── README.md
```

---

## 5. Demo Flow (30-Hour Build Plan)

### Day 1 (Today: 14h of work)

| Hours | Task | Who | Output |
|-------|------|-----|--------|
| 1h | **Setup project structure** + copy real invoices | You | Folder ready, invoices accessible |
| 2h | **Generate synthetic data** (POs, contracts, delivery dockets) | You | `data/synthetic/*.csv` matching real invoice numbers |
| 2h | **Agent 1: OCR Extractor** — pdf→text→structured fields | You | Extracts: invoice#, date, supplier, line items, totals |
| 2h | **Agent 2: PO Matcher** — match invoice lines to PO lines | You | Returns matched + unmatched items |
| 2h | **Agent 3: Contract Validator** — check pricing against contract | You | Reports: price OK, overcharge, undercharge |
| 2h | **Agent 4: Discrepancy Aggregator** — collect all mismatches | You | JSON summary of all discrepancies |
| 2h | **Agent 5: Claim Drafter** — generate recovery claim text | You | Formatted claim document |
| 1h | **Integration: wire agents together** | You | End-to-end pipeline works |

### Day 2 (Tomorrow: 10h of work)

| Hours | Task | Who | Output |
|-------|------|-----|--------|
| 3h | **Dashboard** — Vite + React UI with upload, pipeline status, discrepancies, claims, ledger | You | Working demo interface |
| 2h | **Demo video** — record 3-min walkthrough (Loom/OBS) | You | Submission video |
| 2h | **Write project description** — problem, architecture, screenshots | You | README + submission form |
| 1h | **AMD Fireworks integration** — ensure API calls work smoothly | You | Working cloud agents |
| 1h | **Polish** — error handling, edge cases, README | You | Robust submission |
| 1h | **Submit** — upload to LabLab.ai | You | Done! |

### Buffer: 6 hours (overnight, meals, unforeseen issues)

---

## 6. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Backend Agents** | Python 3.12+ (uvicorn) | Fast, async-capable |
| **Backend API** | **FastAPI** (uvicorn) | Wraps agent pipeline as HTTP endpoints |
| **Database** | SQLite + aiosqlite | Zero-setup, fast enough for demo |
| **OCR** | `pytesseract` + `pdf2image` + `pypdf` | Free, local, mature |
| **LLM Inference (Cloud)** | AMD Fireworks API | Sponsor's platform, free credits |
| **LLM Inference (Local)** | AMD ROCm via `llama.cpp` or `vLLM` | Hybrid architecture story |
| **Fuzzy Matching** | `rapidfuzz` | Agent 2 fallback when Fireworks unavailable |
| **Data Models** | Pydantic + SQLAlchemy | Type-safe, shared across agents + API + DB |
| **Config** | `pydantic-settings` + `.env` | Clean secrets management |
| **Monorepo Tooling** | **pnpm workspaces + Turborepo** | JS/TS build orchestration |
| **Frontend** | **Vite + React 18 + TypeScript** | Fast HMR, demo-grade polish |
| **Frontend State** | TanStack Query + Zustand | Server cache + UI state |
| **Components** | shadcn/ui-style (Radix + Tailwind) | Polished, accessible |
| **Charts** | Recharts | Lightweight React charts |
| **PDF Export (FE)** | `window.print()` + `@media print` CSS | Zero-dependency claim export; print stylesheet for claim letter |

---

## 7. Data Model

### Invoice Document
```
invoice_number: str         # e.g., "INV-00009"
invoice_date: date          # e.g., "2026-03-15"
supplier_name: str          # e.g., "Enclave Studios"
supplier_tax_id: str        # optional
currency: str               # "HKD", "AUD", "USD"
line_items: List[LineItem]
subtotal: Decimal
tax: Decimal
total: Decimal
payment_terms: str          # e.g., "Net 30"
```

### Purchase Order
```
po_number: str              # e.g., "PO-2026-042"
po_date: date
supplier_name: str
line_items: List[POItem]
total_authorized: Decimal
department: str
```

### Line Item
```
description: str
quantity: Decimal
unit: str                   # "hours", "units", "kg", "boxes"
unit_price: Decimal
line_total: Decimal
tax_rate: Decimal           # optional
```

### Discrepancy
```
invoice_number: str
po_number: str
item_description: str
expected_quantity: Decimal
actual_quantity: Decimal
expected_unit_price: Decimal
actual_unit_price: Decimal
difference_amount: Decimal
discrepancy_type: str       # "OVERCHARGE", "UNDERCHARGE", "QTY_MISMATCH", "DUPLICATE"
severity: str               # "LOW", "MEDIUM", "HIGH"
status: str                 # "OPEN", "DRAFTING_CLAIM", "CLAIM_SUBMITTED"
```

### Recovery Claim
```
claim_number: str
invoice_number: str
po_number: str
discrepancies: List[Discrepancy]
total_claim_amount: Decimal
claim_date: date
retailer_ref: str           # optional
status: str                 # "DRAFT", "SUBMITTED", "ACCEPTED", "PAID"
```

---

## 8. Winning Narrative

### Pitch Angles for Judges

**Angle 1: Real Business Problem**
> "We built this for our own company. Invaritech processes FMCG claims recovery. We manually cross-reference invoices, POs, and delivery notes. This agent automates what takes a human 2 hours per claim."

**Angle 2: AMD Full Stack**
> "We use AMD Fireworks for the reasoning agents AND local ROCm acceleration for OCR. The same AMD Instinct architecture powers both inference paths."

**Angle 3: Privacy-First Enterprise**
> "Sensitive supplier documents never leave your GPU. OCR runs locally. Only anonymized structured data touches the cloud for reasoning."

### Judging Criteria Mapping

| Criterion | How We Score |
|-----------|-------------|
| **Technical Complexity** | 5 specialized agents, hybrid local/cloud inference, multi-document cross-referencing |
| **Real-World Impact** | Directly solves a $X billion problem in FMCG retail |
| **AMD Ecosystem Usage** | Fireworks API + ROCm local inference + AMD GPU optimization story |
| **Demo Quality** | Vite + React dashboard with real invoice upload, side-by-side discrepancy view, claim preview |
| **Innovation** | Multi-agent orchestration for document intelligence, not just a chatbot |

---

## 9. Key Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AMD Fireworks API not available | HIGH | Fallback to local-only inference with smaller models |
| PDF extraction fails on some invoices | MEDIUM | Have 8+ real invoices, pick the ones that work best |
| OCR accuracy poor on scanned docs | MEDIUM | Focus on text-based PDFs (most modern invoices are text-PDFs) |
| Streamlit deployment issues | LOW | Demo can run locally, record video as backup |
| Running out of time | MEDIUM | 6h buffer built in; can drop Agent 5 (claim drafter) and show hardcoded output |

---

## 10. Appendices

### A. Real Invoice Inventory (from ~/Downloads)

| File | Type | Size | Notes |
|------|------|------|-------|
| `inv-00009.pdf` | Invoice | 39KB | Sequential series |
| `inv-00010.pdf` (×2 variants) | Invoice | 40KB | Two versions |
| `inv-00011.pdf` | Invoice | 41KB | |
| `inv-00013.pdf` | Invoice | 41KB | |
| `inv-00014.pdf` (×2 variants) | Invoice | 39KB | Two versions |
| `inv-00015.pdf` (×2 variants) | Invoice | 39KB | Two versions |
| `inv-00016.pdf` | Invoice | 40KB | |
| `Zampa Fish Churchills Fish & Chips.pdf` | Delivery/Invoice | 2.4MB | FMCG-relevant! |
| `Enclave Studios` (×6 files) | Invoices | 41-42KB each | Design freelancer |
| `Xata` (×3 files) | Invoices | 79KB each | SaaS platform |
| `invoice_summary.csv` | CSV | Schema | Only 1 entry |
| `invoice_items.csv` | CSV | Schema | Only 1 entry |

### B. AMD Fireworks Available Models

| Model | Use Case |
|-------|----------|
| Llama 4 70B | PO matching, contract validation |
| DeepSeek R1 | Structured reasoning, pricing math |
| Llama 4 Scout | Lightweight classification tasks |
| Mixtral 8x22B | Fallback model |

### C. Synthetic Data Generation Script

```python
# Generate purchase orders that reference real invoice numbers
synthetic_purchase_orders = [
    {
        "po_number": "PO-2026-042",
        "supplier": "TechVendor Co",
        "invoice_ref": "INV-00009",
        "items": [
            {"description": "Cloud Infrastructure", "qty": 1, "unit_price": 8500.00},
            {"description": "DevOps Support", "qty": 40, "unit_price": 150.00, "unit": "hours"},
        ],
        "total_authorized": 14500.00
    },
    # ... more POs
]
```

---

> **Created:** 2026-07-09  
> **Deadline:** 2026-07-10  
> **Hackathon:** AMD Developer Hackathon Act-II — Unicorn Track  
> **Team:** Avishek (Invaritech.ai)