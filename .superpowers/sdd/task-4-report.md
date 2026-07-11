# Task 4 Report

## Result
- Refactored the upload feedback surfaces to use shared `@claims/ui` primitives in the Task 4 files only.
- Preserved the existing upload queue baseline behavior, including picker clearing after submit, globally mounted persistent queue visibility, byte-progress during upload, and backend document-stage polling.
- Added accessible labels for upload file names, queue stages, progress percentages, error state messaging, and remove actions.
- Added `runs` query invalidation in `useUpload` so the run list refreshes after a successful upload flow.

## Files Changed
- `frontend/src/components/ProcessingQueue.tsx`
- `frontend/src/components/UploadPanel.tsx`
- `frontend/src/components/PipelineStepper.tsx`
- `frontend/src/routes/UploadRoute.tsx`
- `frontend/src/hooks/useUpload.ts`

## Checks
- `pnpm --filter @claims/ui typecheck` -> passed
- `pnpm --filter @claims/frontend typecheck` -> passed
- `pnpm --filter @claims/frontend build` -> passed

## Build Notes
- Frontend production build completed successfully.
- Vite emitted a chunk-size warning for `dist/assets/index-DIsBt46w.js` at `1,042.69 kB` minified (`309.57 kB` gzip).

## Concerns
- No functional blockers found during the requested checks.
- Bundle size remains above Vite's default warning threshold and may be worth addressing separately with code splitting or manual chunking.

## Task 4 Fix Follow-up

### Result
- Preserved the approved per-document queue behavior and immediate picker-list clearing.
- Kept a visible pending state after submit while the upload mutation runs, even after the picker list is cleared.
- Kept mutation-level upload error feedback visible after the picker list is cleared.
- Reset the hidden file input value after submit so selecting the same file again triggers `onChange`.
- Did not change the intentional queue semantics from the prior processing-queue phase, including partial-success handling and per-document processing.

### Checks
- `pnpm --filter @claims/ui typecheck` -> passed
- `pnpm --filter @claims/frontend typecheck` -> passed
- `pnpm --filter @claims/frontend build` -> passed
- `pnpm --filter @claims/frontend build` emitted the existing Vite chunk-size warning for `dist/assets/index-DxXYmshn.js` at `1,043.28 kB` minified (`309.65 kB` gzip).

### Intentional-semantics note
- The upload flow still submits the full batch to the existing queue-backed mutation and preserves the established per-document/partial-success semantics from the previous phase.
