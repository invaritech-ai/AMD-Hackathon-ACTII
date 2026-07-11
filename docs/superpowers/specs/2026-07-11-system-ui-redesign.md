# System UI Redesign Specification

## Objective

Turn ClaimsRecovery into a coherent operational control plane. Preserve every
route, API, workflow, and dark-mode brand decision while eliminating the
skewed app shell, weak selection state, arbitrary page widths, and generic
card stacks visible in the current product.

## Design Read

ClaimsRecovery is a trust-first B2B operations product for claims analysts.
It should feel precise, quiet, and decisive. The visual language is a dark
navy command center with amber reserved for active navigation and primary
actions. Green, amber, and red remain semantic status colors only.

Design settings:

- Design variance: 3. Use a disciplined grid, not decorative asymmetry.
- Motion intensity: 3. Restrained state feedback only, never ambient motion.
- Visual density: 6. Information-rich but scannable.

## Visual Contract

### Geometry

- Desktop app shell uses a 15rem sidebar and a flexible `min-w-0` main canvas.
- Every route renders in one centered application container:
  `max-width: 87.5rem`, desktop horizontal padding `2.5rem`, tablet padding
  `2rem`, phone padding `1.25rem`.
- Routes use the same vertical rhythm: page top `2.5rem`, section gap `2rem`,
  component gap `1rem`.
- Desktop and mobile must never expose horizontal overflow. Mobile becomes a
  single-column layout below 768px.

### Tokens

- Background: `#0B1220`; recessed canvas: `#0F192A`; standard surface:
  `#162238`; elevated surface: `#1B2941`.
- Border: `#2B3B55`; strong border: `#40516D`.
- Strong text: `#F4F7FB`; body text: `#A8B5C8`; muted text: `#71819A`.
- Primary amber: `#F6A623`; hover amber: `#FFC04D`; amber foreground:
  `#111827`.
- Success: `#2BCB88`; destructive: `#F16464`.
- Component radius: 10px; major workspace radius: 16px; icon controls: 8px.
- Surface depth comes from a subtle inner highlight and navy-tinted shadow,
  never a generic black drop shadow.

### Navigation

- Navigation selection is owned by `SidebarMenuButton`, not overridden by
  individual routes.
- Active item: 2px amber inset rail, amber-tinted surface, high-contrast text
  and icon, and a restrained amber ambient shadow.
- Hover item: quiet surface lift only. It must never compete with selection.
- Selection transition: 180ms `cubic-bezier(0.16, 1, 0.3, 1)` using color,
  opacity, and transform only. Reduced motion removes movement.

### Surfaces and Type

- Do not wrap every grouping in a card. Use open spacing and dividers for
  lists; reserve elevated cards for tasks, confirmation, and critical data.
- Major workspace panels use a thin outer bezel and a recessed inner surface.
- Keep Fira Sans and Fira Code. Use clear roles: page title, route summary,
  section title, body, label, and tabular data.
- Headings use `text-wrap: balance`; route descriptions cap at 65 characters.
- Decorative status dots and uppercase micro-labels are removed unless they
  communicate live system state.

### Accessibility and Feedback

- Every interactive surface has visible `focus-visible` feedback with an amber
  ring. Keyboard focus must not rely on color alone.
- All status and destructive states pair color with plain-language text.
- Existing loading, empty, error, delete confirmation, drawer, and slide-over
  behavior remains functional and receives the same visual system.
- All motion respects `prefers-reduced-motion` and animates only transform or
  opacity.

## Route Compositions

### Pipeline

- Replace the static queue explanation with a live intake summary.
- Compose a primary upload canvas and secondary status rail inside the same
  centered workspace. The upload canvas must not consume empty vertical space.
- Selected files, processing queue, and run progress become distinct states of
  the same workflow rather than unrelated cards.

### Cases

- Keep the case rail, scoped graph, and files library. Align them to a shared
  workspace grid and reserve amber only for the selected case or primary
  curation action.
- The graph stays read-only. Mutation/API work remains independent of this
  visual redesign.

### Discrepancies, Claims, and Ledger

- Outcome pages use the shared page frame and data-surface roles.
- Tables and timelines favor readable density, tabular numbers, strong status
  labels, and quiet dividers over nested cards.
- No route may introduce a bespoke width, radius, accent color, or focus style.

## Non-goals

- No route URL, navigation label, API endpoint, query key, or backend behavior
  changes.
- No new component library or framework migration.
- No decorative imagery, generated mock data, purple visual accent, animated
  background, or marketing-page treatment.
- No attach/detach or reconciliation API work in this redesign phase.

## Acceptance Gate

- At 1440px, all primary routes show equal optical gutters and a centered main
  canvas.
- At 375px, no horizontal overflow, clipped labels, or unreachable controls.
- Active sidebar state is obvious at a glance in expanded, collapsed, and
  mobile-drawer states.
- Every route uses the same surface, radius, text, and interaction contract.
- Visual comparison screenshots exist for Pipeline, Cases, Discrepancies,
  Claims, and Ledger in desktop and mobile layouts.
