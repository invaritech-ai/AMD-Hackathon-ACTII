# Frontend Design Spec — Claims Recovery Dashboard

**Author:** Rudy (frontend lead)
**Date:** 2026-07-10
**Status:** Approved

---

## 1. Monorepo Layout

```
/
├── backend/                  # Jude's FastAPI + SQLite + agents (backend owns)
├── frontend/                 # Vite + React + TS dashboard (this spec)
├── packages/
│   ├── shared/               # OpenAPI spec + auto-generated TS types (Jude exports)
│   └── ui/                   # Shared component library (Tailwind + Radix + shadcn-style)
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

`packages/shared` is the API contract bridge. Frontend generates TS types from `openapi.yaml` that Jude publishes. Fallback: define temp types from PLAN §7 data models and swap when the spec lands.

---

## 2. Tech Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Runtime | Vite 6 + React 18 + TypeScript 5 | Fast HMR, mature ecosystem |
| Server state | TanStack Query v5 | Caching, polling (2s interval for pipeline), stale-while-revalidate |
| UI state | Zustand | Lightweight: activeRunId, selectedDiscrepancyId, sidebarCollapsed |
| Routing | React Router v6 | Four declarative routes |
| HTTP client | `fetch` behind a typed wrapper | Zero extra dep; types from shared package |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | Utility-first, no CSS-in-JS overhead |
| Components | Radix primitives + custom shadcn-style in `packages/ui` | Accessible, composable, hackathon volume |
| Charts | Recharts | Lightweight, composable React charts, strong TS support |
| PDF export | `window.print()` + `@media print` CSS | Zero dependency; claim letter styled for print |
| Package manager | pnpm 9+ | Workspace protocol, fast installs |
| Monorepo | Turborepo v2 | Cached, parallel builds |

---

## 3. API Contract (consume from backend)

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/invoices` | `POST` | Multipart PDF(s) | `{ run_id: string }` |
| `/runs/{id}` | `GET` | — | `{ id, status, agents: [...AgentStatus], discrepancies?: Discrepancy[], claim?: Claim }` |
| `/runs` | `GET` | — | `[...RunSummary]` |

**AgentStatus shape (expected):**
```ts
{ agent_id: number, name: string, status: "pending" | "processing" | "done" | "error", started_at?: string, completed_at?: string, error?: string }
```

**Polling strategy:** `useRun(id)` polls `/runs/{id}` every 2s while `status === "processing"`, stops on `"done"` or `"error"`. TanStack Query handles refetchInterval + enabled conditions.

---

## 4. Routing

| Path | Surface | View |
|------|---------|------|
| `/` | Upload + Pipeline Stepper | Hero flow: drag-drop invoice, agent 1→5 progress |
| `/discrepancies/:runId` | Discrepancy table + drill-down | Side-by-side mismatches with severity chips |
| `/claims/:runId` | Claim draft viewer | Markdown claim letter, copy + print-to-PDF |
| `/ledger` | Recovery ledger dashboard | Stats cards, supplier breakdown chart, timeline |

Nav: persistent sidebar with icons + labels. Active route highlighted.

---

## 5. Component Tree & Data Flow

```
App
├── Layout
│   └── Sidebar (nav links, run history list)
├── UploadRoute  (/)
│   ├── UploadPanel        (drag-drop zone, file list, submit button)
│   │   → useUpload().mutate(file) → run_id → navigate to UploadRoute with runId
│   └── PipelineStepper    (Agent 1→2→3→4→5, per-agent status + duration)
│       → useRun(runId) polls /runs/{id}
│       → on done: CTA buttons → /discrepancies/{runId}, /claims/{runId}
├── DiscrepanciesRoute  (/discrepancies/:runId)
│   ├── DiscrepancyTable   (sortable, filterable by type/severity)
│   │   → useRun(runId) reads discrepancies[]
│   └── DiscrepancyDetail  (slide-over: explanation, expected vs actual, supporting docs)
│       → zustand.uiStore.selectedDiscrepancyId
├── ClaimsRoute  (/claims/:runId)
│   └── ClaimPreview       (markdown rendered, copy raw text, print-to-PDF button)
│       → useRun(runId) reads claim
└── LedgerRoute  (/ledger)
    ├── LedgerStats         (4 KPI cards: total claim value, recovery rate, open claims, avg days)
    │   → useRuns() reads all run summaries
    ├── SupplierBreakdown   (Recharts horizontal bar: claim value by supplier)
    └── ClaimTimeline       (Recharts area/line: claim value over time)
```

---

## 6. Design System (`packages/ui`)

### Color palette (dark theme default)

| Token | Value | Usage |
|-------|-------|-------|
| Background | `gray-950` | Page background |
| Surface | `gray-900` | Cards, panels |
| Border | `gray-800` | Dividers, input borders |
| Text primary | `gray-100` | Body, headings |
| Text secondary | `gray-400` | Labels, metadata |
| Accent | `indigo-500` | Primary buttons, active states |
| Severity HIGH | `red-500` | Badge, highlight rows |
| Severity MEDIUM | `amber-500` | Badge, highlight rows |
| Severity LOW | `emerald-500` | Badge, highlight rows |
| Success | `emerald-400` | Donn status, positive numbers |
| Error | `red-400` | Error states |

### Typography

- Font: Inter (system fallback: SF Pro / Segoe UI)
- Headings: text-xl / text-2xl, font-semibold
- Body: text-sm, text-base
- Code/monospace: JetBrains Mono (for claim text, amounts, IDs)

### Components in `packages/ui`

- **Button** — variants: primary (indigo), secondary (gray), ghost, danger
- **Card** — padded surface with border, optional header/footer
- **Badge** — severity-colored chips: red/amber/green/gray
- **Stepper** — horizontal step indicator with done/active/pending states + checkmarks
- **Table** — sortable headers, striped rows, row click handler
- **Dialog** — modal with overlay, title, content, close
- **SlideOver** — right-side panel (for discrepancy detail)
- **Input** — dark-themed text input, file drop zone
- **Tabs** — horizontal tab bar
- **Skeleton** — shimmer loading placeholders

---

## 7. Scope Boundaries

### Building (today)
- All four routes and their components
- Polling-based pipeline status with live stepper
- Sortable, filterable discrepancy table
- Claim markdown rendering + print-to-PDF
- Ledger with Recharts supplier breakdown + timeline
- Package `ui` with Button, Card, Badge, Stepper, Table, Dialog, SlideOver
- Typed API client against backend contract
- Skeleton/loading states for every query
- Empty states ("No runs yet — upload an invoice to start")
- Error states per query

### NOT building (hackathon scope cut)
- Auth / login / user management
- SSE streaming (polling is sufficient)
- PDF annotation / inline editing
- Multi-user / team collaboration
- Storybook or visual regression tests
- E2E tests (manual smoke test instead)
- Mobile responsive (desktop-only, minimum 1280px)
- Light theme toggle
- Internationalization

---

## 8. Error & Edge Case Handling

| Scenario | Behavior |
|----------|----------|
| Upload fails (network) | Toast error, retry button |
| Upload fails (invalid file) | Inline validation error "Only PDF files accepted" |
| Pipeline errors (agent N fails) | Stepper shows red X at failed agent, error message inline |
| Run not found (stale URL) | 404 state with "Run not found" + link back to upload |
| Backend unreachable | Query error state with retry button |
| No discrepancies found | "All clear — invoice matches PO and contract" success state |
| No claims drafted yet | Empty state "Claim drafting in progress..." |
| Ledger is empty (no runs) | "Upload your first invoice to get started" CTA |
| Long-running pipeline (>30s) | Polling continues, no timeout — let backend handle |

---

## 9. Implementation Order

1. **Monorepo scaffold:** root pnpm, Turborepo, `frontend/` Vite, `packages/ui/`, `packages/shared/` (temp)
2. **packages/ui:** Button, Card, Badge, Stepper, Table, Dialog, SlideOver, Skeleton, Input
3. **frontend/src/lib:** Typed API client, queryClient, Zustand store
4. **frontend/src routes:** Layout + Sidebar + routing skeleton
5. **UploadRoute:** UploadPanel + PipelineStepper (hardcoded first, wire to API after)
6. **DiscrepanciesRoute:** DiscrepancyTable + DiscrepancyDetail
7. **ClaimsRoute:** ClaimPreview + print-to-PDF
8. **LedgerRoute:** LedgerStats + SupplierBreakdown (Recharts) + ClaimTimeline (Recharts)
9. **Polish:** empty states, error states, skeleton loaders, demo video prep