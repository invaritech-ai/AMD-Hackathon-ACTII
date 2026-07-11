import type { CaseSummary } from "@claims/shared";

// The backend currently returns title: null, so cases used to render as raw
// hashes ("Case 9ce032c9"). Give every case a clean, uniform identity: a
// sequential number for the name, the linking evidence id as the anchor, and
// the short hash kept only as a reference.
export function caseLabel(caseItem: CaseSummary, index: number) {
  const title = caseItem.title?.trim() || `Case ${String(index + 1).padStart(2, "0")}`;
  return {
    title,
    anchor: caseItem.shared_ids[0] ?? null,
    ref: caseItem.case_id.slice(0, 6),
  };
}
