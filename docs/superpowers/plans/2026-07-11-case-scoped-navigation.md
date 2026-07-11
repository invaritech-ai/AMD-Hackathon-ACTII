# Case-Scoped Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Discrepancies and Claims sidebar links open the first live case and provide an in-page selector for switching case-scoped reconciliation views.

**Architecture:** The live case list remains the only source of case navigation data. A small route helper builds scoped URLs, a shared native case selector changes the current route, and the sidebar derives its case-dependent destinations from `cases[0].case_id` without adding global state or persistence.

**Tech Stack:** React 18, React Router 6, TanStack Query 5, TypeScript 5.7, Tailwind CSS 4, existing shadcn-style `@claims/ui` primitives.

## Global Constraints

- Use the first case returned by `GET /api/v1/cases` as the sidebar default.
- Do not add Zustand state, localStorage, sessionStorage, or URL query parameters.
- Keep scoped routes `/cases/:caseId/discrepancies` and `/cases/:caseId/claims`.
- Preserve the existing dark command-center tokens, sidebar primitive, labels, and active-state treatment.
- Keep Pipeline, Cases, and Ledger destinations unchanged.
- The repository has no frontend test runner; do not add one for this navigation change. Validate with TypeScript, production build, and route acceptance checks.

---

### Task 1: Scoped Route Helper and Case Selector

**Files:**
- Create: `frontend/src/lib/caseRoutes.ts`
- Create: `frontend/src/components/cases/CaseSelector.tsx`

**Interfaces:**
- Produces: `type CasePage = "discrepancies" | "claims"`
- Produces: `caseScopedPath(caseId: string, page: CasePage): string`
- Produces: `CaseSelector({ cases, currentCaseId, page, isLoading })`

- [ ] **Step 1: Create the scoped route helper**

```ts
export type CasePage = "discrepancies" | "claims";

export function caseScopedPath(caseId: string, page: CasePage) {
  return `/cases/${encodeURIComponent(caseId)}/${page}`;
}
```

- [ ] **Step 2: Create the shared case selector**

```tsx
import { useNavigate } from "react-router-dom";
import type { CaseSummary } from "@claims/shared";
import { caseLabel } from "@/lib/caseLabel";
import { caseScopedPath, type CasePage } from "@/lib/caseRoutes";

interface CaseSelectorProps {
  cases?: CaseSummary[];
  currentCaseId: string;
  page: CasePage;
  isLoading: boolean;
}

export function CaseSelector({ cases, currentCaseId, page, isLoading }: CaseSelectorProps) {
  const navigate = useNavigate();

  return (
    <label className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-foreground-subtle)]">
        Case
      </span>
      <select
        aria-label="Select case"
        value={currentCaseId}
        disabled={isLoading || !cases?.length}
        onChange={(event) => navigate(caseScopedPath(event.target.value, page))}
        className="h-9 min-w-44 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-[12px] font-semibold text-[var(--color-foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgb(246_166_35_/_0.16)] disabled:opacity-50"
      >
        {cases?.map((caseItem, index) => (
          <option key={caseItem.case_id} value={caseItem.case_id}>
            {caseLabel(caseItem, index).title}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 3: Run frontend typecheck**

Run: `pnpm --filter @claims/frontend typecheck`

Expected: command exits with status 0.

- [ ] **Step 4: Commit the shared navigation unit**

```bash
git add frontend/src/lib/caseRoutes.ts frontend/src/components/cases/CaseSelector.tsx
git commit -m "feat(ui): add case-scoped route selector"
```

---

### Task 2: Responsive Sidebar Destinations

**Files:**
- Modify: `frontend/src/components/Layout.tsx`

**Interfaces:**
- Consumes: `useCases()` from `frontend/src/hooks/useCases.ts`
- Consumes: `caseScopedPath(caseId, page)` from Task 1
- Produces: working sidebar destinations for the first live case

- [ ] **Step 1: Fetch cases once in the shared layout**

Add `const casesQuery = useCases();` in `Layout` and derive:

```ts
const defaultCaseId = casesQuery.data?.[0]?.case_id ?? null;
```

- [ ] **Step 2: Replace static case-dependent destinations**

Pass `defaultCaseId` and `casesQuery.isLoading` to `AppSidebarMenu`. Resolve destinations as follows:

```ts
const destination =
  item.to === "/discrepancies"
    ? defaultCaseId
      ? caseScopedPath(defaultCaseId, "discrepancies")
      : "/graph"
    : item.to === "/claims"
      ? defaultCaseId
        ? caseScopedPath(defaultCaseId, "claims")
        : "/graph"
      : item.to;
```

Use `destination` as the `NavLink` target. Add `aria-disabled={caseDependent && casesLoading}` and prevent navigation while the case list is loading.

- [ ] **Step 3: Preserve scoped active states**

Keep the existing regular expressions for `/cases/{caseId}/discrepancies` and `/cases/{caseId}/claims`. Do not derive active state from the resolved default destination because the user may switch to another case in-page.

- [ ] **Step 4: Run frontend typecheck**

Run: `pnpm --filter @claims/frontend typecheck`

Expected: command exits with status 0.

- [ ] **Step 5: Commit sidebar routing**

```bash
git add frontend/src/components/Layout.tsx
git commit -m "feat(ui): scope sidebar links to first case"
```

---

### Task 3: Case Selection on Discrepancies and Claims

**Files:**
- Modify: `frontend/src/routes/DiscrepanciesRoute.tsx`
- Modify: `frontend/src/routes/ClaimsRoute.tsx`

**Interfaces:**
- Consumes: `useCases()` from `frontend/src/hooks/useCases.ts`
- Consumes: `CaseSelector` and `caseScopedPath` from Task 1
- Produces: validated case-scoped pages with an in-page case switcher

- [ ] **Step 1: Load the case list on each scoped page**

Add `const casesQuery = useCases();` beside the existing reconciliation query. Derive:

```ts
const defaultCaseId = casesQuery.data?.[0]?.case_id;
const caseExists = casesQuery.data?.some((caseItem) => caseItem.case_id === caseId) ?? false;
```

- [ ] **Step 2: Redirect invalid case IDs**

After hooks run and before rendering page content, add:

```tsx
if (!caseId) return <Navigate to="/graph" replace />;
if (!casesQuery.isLoading && defaultCaseId && !caseExists) {
  return <Navigate to={caseScopedPath(defaultCaseId, page)} replace />;
}
if (!casesQuery.isLoading && !defaultCaseId) {
  return <Navigate to="/graph" replace />;
}
```

Use `page = "discrepancies"` in `DiscrepanciesRoute` and `page = "claims"` in `ClaimsRoute`.

- [ ] **Step 3: Add the selector to page actions**

Render the shared selector before the existing Reconcile and Copy actions:

```tsx
<CaseSelector
  cases={casesQuery.data}
  currentCaseId={caseId}
  page={page}
  isLoading={casesQuery.isLoading}
/>
```

- [ ] **Step 4: Keep reconciliation data scoped to the URL**

Continue calling `useCaseReconciliation(caseId ?? null)` and `runReconciliation.mutate(caseId)`. No additional selected-case state is introduced.

- [ ] **Step 5: Run frontend typecheck and production build**

Run: `pnpm --filter @claims/frontend typecheck`

Expected: command exits with status 0.

Run: `pnpm --filter @claims/frontend build`

Expected: Vite finishes successfully. The existing large-chunk advisory may remain.

- [ ] **Step 6: Perform route acceptance checks**

- Open `/discrepancies` and confirm it redirects through `/graph` until a case-dependent sidebar destination is selected.
- Click Discrepancies and confirm the URL contains `cases[0].case_id`.
- Change the selector and confirm both URL and reconciliation content update.
- Repeat for Claims.
- Enter an unknown case ID and confirm redirect to the first live case.
- Confirm Pipeline, Cases, and Ledger links are unchanged.

- [ ] **Step 7: Commit scoped pages**

```bash
git add frontend/src/routes/DiscrepanciesRoute.tsx frontend/src/routes/ClaimsRoute.tsx
git commit -m "feat(ui): add case selection to recovery pages"
```
