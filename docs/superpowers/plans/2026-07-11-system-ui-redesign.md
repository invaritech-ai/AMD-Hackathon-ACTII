# System UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for this user-approved inline implementation. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild ClaimsRecovery's shared UI system so every route has centered geometry, an unmistakable selected navigation state, and a coherent operational visual language.

**Architecture:** Keep React, Tailwind v4, Radix, and local `@claims/ui`. Establish tokens and shell behavior in shared files first, then compose every route from those primitives. Preserve existing data hooks, APIs, URLs, and domain interactions.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, Radix primitives, local shadcn-style `@claims/ui`, TanStack Query.

## Global Constraints

- Preserve every existing URL, API request, query key, mutation, and backend contract.
- Use only the existing local `@claims/ui` component library; do not add another UI package.
- Retain the dark navy product identity and reserve amber for selection and primary actions.
- Use a `max-w-[1400px] mx-auto` page canvas with responsive 20px, 32px, and 40px gutters.
- Use `min-w-0` at app-shell and page-content flex boundaries to prevent overflow.
- Active sidebar styling belongs in `packages/ui/src/components/Sidebar.tsx` and must not depend on route-level class precedence.
- Motion is 180ms, transform/opacity/color only, and reduced-motion safe.
- Focus-visible states, loading, empty, error, and destructive states must remain accessible.
- Do not change backend code or the current API-integration backlog.
- The frontend has no test harness. Use typechecks, production build, and desktop/mobile screenshot comparison as the validation gate.

---

### Task 1: Establish shell geometry and token contract

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/Layout.tsx`
- Modify: `frontend/src/components/PageContainer.tsx`
- Modify: `packages/ui/src/components/Sidebar.tsx`

**Interfaces:**
- Consumes: CSS variables, `SidebarProvider`, `Sidebar`, `SidebarInset`, and `SidebarMenuButton`.
- Produces: shared visual tokens, a centered route canvas, and selected-state behavior consumed by all routes.

- [ ] Capture Pipeline at desktop width. Record the left-pinned canvas, right-hand dead space, and gray selected sidebar state.
- [ ] Replace the token values in `index.css` with the specification's background, surface, border, text, amber, success, and destructive colors.
- [ ] Add `--duration-interaction: 180ms` and `--ease-emphasized: cubic-bezier(0.16, 1, 0.3, 1)`.
- [ ] Add `.surface-recessed`, `.surface-raised`, and `.workspace-bezel` utilities. Each utility uses the shared radius, inner highlight, and navy-tinted shadow language.
- [ ] Change `PageContainer` to `mx-auto w-full max-w-[1400px] min-w-0 px-5 py-8 sm:px-8 lg:px-10 xl:py-10`.
- [ ] Add `min-w-0` to the content boundary in `Layout.tsx` and `SidebarInset`; retain the existing route scroll container.
- [ ] Replace Sidebar's default `data-[active=true]` gray selector with an amber inset rail, amber-tinted surface, high-contrast icon/text, and restrained amber shadow.
- [ ] Simplify `AppSidebarMenu` so it supplies active semantics and typography only; it must not compete with primitive background classes.
- [ ] Capture Pipeline at desktop and 375px. Confirm equal optical gutters, no horizontal scrollbar, and a clear selected state in expanded and collapsed sidebar modes.
- [ ] Run `pnpm --filter @claims/ui typecheck`, `pnpm --filter @claims/frontend typecheck`, and `pnpm --filter @claims/frontend build`. Each command must exit 0.
- [ ] Commit with `git add frontend/src/index.css frontend/src/components/Layout.tsx frontend/src/components/PageContainer.tsx packages/ui/src/components/Sidebar.tsx && git commit -m "feat(ui): establish command center shell"`.

### Task 2: Normalize shared controls and page hierarchy

**Files:**
- Modify: `packages/ui/src/components/Button.tsx`
- Modify: `packages/ui/src/components/Card.tsx`
- Modify: `packages/ui/src/components/Badge.tsx`
- Modify: `packages/ui/src/components/Input.tsx`
- Modify: `frontend/src/components/PageHeader.tsx`
- Modify: `frontend/src/components/ProcessingQueue.tsx`

**Interfaces:**
- Consumes: Task 1 tokens and surface utilities.
- Produces: shared controls and headings that every route can compose without one-off color, border, or radius overrides.

- [ ] Capture Pipeline and Cases. Mark nested cards, decorative dots, uppercase labels, and weak primary/secondary states.
- [ ] Give Card explicit standard, recessed, and elevated visual roles while preserving its current public API.
- [ ] Make Button use one amber primary treatment, quiet secondary/ghost states, amber focus-visible ring, and `active:scale-[0.98]`.
- [ ] Make Badge semantic rather than decorative. Keep success, warning, destructive, and neutral states readable without relying on color alone.
- [ ] Keep Input's focus ring amber. Restrict its transitions to color, border-color, box-shadow, and opacity.
- [ ] Refactor PageHeader to use page title, concise description, and live semantic status only. Remove decorative route dots.
- [ ] Refactor ProcessingQueue into a compact operational surface with status text, progress, and clear upload relationship.
- [ ] Verify keyboard focus on button, input, sidebar item, and queue controls. Capture one empty and one active queue state.
- [ ] Run the Task 1 verification commands. Each command must exit 0.
- [ ] Commit with `git add packages/ui/src/components/Button.tsx packages/ui/src/components/Card.tsx packages/ui/src/components/Badge.tsx packages/ui/src/components/Input.tsx frontend/src/components/PageHeader.tsx frontend/src/components/ProcessingQueue.tsx && git commit -m "feat(ui): unify controls and hierarchy"`.

### Task 3: Recompose the Pipeline workspace

**Files:**
- Modify: `frontend/src/routes/UploadRoute.tsx`
- Modify: `frontend/src/components/UploadPanel.tsx`
- Modify: `frontend/src/components/PipelineStepper.tsx`

**Interfaces:**
- Consumes: Task 1 page canvas, Task 2 primitive roles, existing `useUpload` mutation, and `useRunStatus` polling.
- Produces: a responsive intake workspace while preserving upload, selection, queue, and pipeline behavior.

- [ ] Capture empty intake, selected-file batch, pending upload, upload error, and completed-run states.
- [ ] At `xl`, render the intake as `grid-cols-[minmax(0,1fr)_22rem]`. The primary column owns the upload canvas and selected batch; the secondary column owns live queue/rule context. Below `xl`, stack the sections.
- [ ] Replace the static Persistent Queue explanation with current status derived from existing upload state. Preserve drag/drop and keyboard file-picker behavior.
- [ ] Use the workspace bezel only around the main intake canvas. Keep an amber primary action only when files are selected.
- [ ] Keep error recovery red and explicit. Keep pipeline progress semantic and tabular without oversized empty areas.
- [ ] Capture desktop and 375px Pipeline screens for empty, queued, and running states. Confirm no overflow and one primary action per state.
- [ ] Run the Task 1 verification commands. Each command must exit 0.
- [ ] Commit with `git add frontend/src/routes/UploadRoute.tsx frontend/src/components/UploadPanel.tsx frontend/src/components/PipelineStepper.tsx && git commit -m "feat(ui): compose pipeline intake workspace"`.

### Task 4: Recompose the Case Command Center

**Files:**
- Modify: `frontend/src/routes/GraphRoute.tsx`
- Modify: `frontend/src/components/cases/CaseRail.tsx`
- Modify: `frontend/src/components/cases/CaseWorkspaceHeader.tsx`
- Modify: `frontend/src/components/cases/FilesLibrary.tsx`
- Modify: `frontend/src/components/CaseGraph.tsx`
- Modify: `frontend/src/components/DocumentDetailPanel.tsx`

**Interfaces:**
- Consumes: existing case/document queries and the read-only graph contract.
- Produces: a coherent case workspace without changing API behavior.

- [ ] Capture seeded active case, no selected case, graph loading/error, and library filtering states.
- [ ] At `xl`, preserve the rail, graph, and library relationship with `grid-cols-[15rem_minmax(0,1fr)_22rem]`.
- [ ] Use amber only for active case and primary curation action. Apply recessed treatment to graph canvas and elevated treatment only to actionable library/detail surfaces.
- [ ] Keep search, filters, delete confirmation, and document-detail APIs. Replace arbitrary dense borders and weak chips with shared controls.
- [ ] Preserve accessible dialog titles, descriptions, close controls, and focus rings.
- [ ] Capture populated desktop Case Command Center, 375px stacked case layout, keyboard focus on file deletion, and document detail drawer state.
- [ ] Run the Task 1 verification commands. Each command must exit 0.
- [ ] Commit with `git add frontend/src/routes/GraphRoute.tsx frontend/src/components/cases/CaseRail.tsx frontend/src/components/cases/CaseWorkspaceHeader.tsx frontend/src/components/cases/FilesLibrary.tsx frontend/src/components/CaseGraph.tsx frontend/src/components/DocumentDetailPanel.tsx && git commit -m "feat(ui): align case command center"`.

### Task 5: Recompose outcome routes

**Files:**
- Modify: `frontend/src/routes/DiscrepanciesRoute.tsx`
- Modify: `frontend/src/components/DiscrepancyDetail.tsx`
- Modify: `frontend/src/components/DiscrepancyTable.tsx`
- Modify: `frontend/src/routes/ClaimsRoute.tsx`
- Modify: `frontend/src/components/ClaimTimeline.tsx`
- Modify: `frontend/src/routes/LedgerRoute.tsx`
- Modify: `frontend/src/components/LedgerStats.tsx`
- Modify: `frontend/src/components/SupplierBreakdown.tsx`

**Interfaces:**
- Consumes: existing route queries and Task 1-2 visual contract.
- Produces: outcome screens that use readable data density and shared status hierarchy.

- [ ] Capture Discrepancies, Claims, and Ledger at desktop and 375px. Note truncated data, uneven widths, nested cards, and status ambiguity.
- [ ] Use open sections, concise metric groups, quiet dividers, tabular numbers, and semantic severity/status treatments.
- [ ] Do not add charts, route state, or API calls. Preserve slide-over and claim timeline interactions.
- [ ] Capture all three desktop/mobile routes and inspect focus, empty, error, and long-value behavior.
- [ ] Run the Task 1 verification commands. Each command must exit 0.
- [ ] Commit with `git add frontend/src/routes/DiscrepanciesRoute.tsx frontend/src/components/DiscrepancyDetail.tsx frontend/src/components/DiscrepancyTable.tsx frontend/src/routes/ClaimsRoute.tsx frontend/src/components/ClaimTimeline.tsx frontend/src/routes/LedgerRoute.tsx frontend/src/components/LedgerStats.tsx frontend/src/components/SupplierBreakdown.tsx && git commit -m "feat(ui): standardize outcome workspaces"`.

### Task 6: Visual acceptance review and handoff

**Files:**
- Modify: `docs/superpowers/specs/2026-07-11-system-ui-redesign.md`

**Interfaces:**
- Consumes: all prior visual work.
- Produces: evidence that the app is no longer skewed, inconsistent, or weak in selected states.

- [ ] Capture Pipeline, Cases, Discrepancies, Claims, and Ledger at 1440px and 375px. Include active sidebar, collapsed sidebar, mobile drawer, focused control, empty/loading/error state, and destructive confirmation evidence.
- [ ] Reject any route with unequal gutters, horizontal overflow, gray active navigation, route-specific accent/radius/focus style, unreadable muted text, or non-semantic decorative status indicator.
- [ ] Run `pnpm --filter @claims/ui typecheck`, `pnpm --filter @claims/frontend typecheck`, and `pnpm --filter @claims/frontend build`. Each command must exit 0. Record any Vite chunk advisory separately.
- [ ] Commit with `git add docs/superpowers/specs/2026-07-11-system-ui-redesign.md && git commit -m "docs(ui): record visual acceptance review"`.
