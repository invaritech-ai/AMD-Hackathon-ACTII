# Case-Scoped Sidebar Navigation Design

## Objective

Make the Discrepancies and Claims sidebar destinations immediately usable by routing them to a valid case. Both pages must also let the analyst switch cases without returning to the Case Command Center.

## Selected Approach

Use the first case returned by `GET /api/v1/cases` as the sidebar default. Keep the selection stateless: the scoped route URL is the source of truth, and no Zustand or browser persistence is added.

## Navigation Behavior

- Pipeline continues to route to `/`.
- Cases continues to route to `/graph`.
- Discrepancies routes to `/cases/{cases[0].case_id}/discrepancies`.
- Claims routes to `/cases/{cases[0].case_id}/claims`.
- Ledger remains unchanged.
- While cases are loading, case-dependent links remain visually disabled.
- When no cases exist, case-dependent links route to `/graph` so the existing empty-case state is shown.
- Scoped URLs remain directly addressable and control the sidebar active state.

## In-Page Case Selection

Add one compact shared `CaseSelector` control to Discrepancies and Claims.

- It receives the current `case_id`, the live case list, and the current page kind.
- It displays the same human-friendly labels used by the Case Command Center.
- Selecting a case navigates to the corresponding scoped route for the current page.
- It does not store separate selection state.
- If the URL contains an unknown case, the page redirects to the first live case for that page kind.

## Components and Responsibilities

### `Layout`

Fetch the case list through the existing `useCases` query, derive the first case ID, and construct sidebar destinations for Discrepancies and Claims. Preserve the existing shadcn sidebar component and active-state styling.

### `CaseSelector`

Provide a shared, keyboard-accessible case switcher for both scoped pages. The control owns presentation only; route navigation remains explicit through React Router.

### `DiscrepanciesRoute` and `ClaimsRoute`

Read `caseId` from the route, render `CaseSelector`, fetch the reconciliation for that case, and redirect invalid case IDs to the first live case.

## Data Flow

1. `useCases` fetches the live case list.
2. Sidebar destinations use `cases[0].case_id`.
3. A scoped page reads `caseId` from the URL.
4. `CaseSelector` renders the live case list and current selection.
5. A selection change navigates to the same page kind with the new `caseId`.
6. React Query reuses the existing cases cache and fetches the selected case reconciliation.

## Error and Empty States

- Case list loading: disable case-dependent sidebar links and show a loading state in the selector.
- Case list failure: route case-dependent links to `/graph`; scoped pages show the existing reconciliation error state.
- Empty case list: route to `/graph`.
- Invalid scoped case ID: redirect to the first available case while preserving the page kind.

## Visual Direction

Preserve the existing dark operations design system. The selector is a compact command control, not another large card or rail. It uses existing typography, border, focus, and amber selection tokens.

## Verification

- Sidebar Discrepancies and Claims links include the first live case ID.
- Direct scoped URLs render the correct reconciliation.
- Switching cases updates the URL and displayed data.
- Invalid IDs redirect to the first live case.
- No-case and loading states remain safe.
- Existing Pipeline, Cases, and Ledger navigation is unchanged.
