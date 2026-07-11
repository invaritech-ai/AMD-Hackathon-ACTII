import type { ClaimLedgerStatus } from "@claims/shared";

export const STATUS_LABEL: Record<ClaimLedgerStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  partially_recovered: "Partially recovered",
  recovered: "Recovered",
  rejected: "Rejected",
  written_off: "Written off",
};

// Badge variants that exist in @claims/ui (no "warning" — amber is "medium").
export const STATUS_VARIANT: Record<ClaimLedgerStatus, "neutral" | "info" | "success" | "medium" | "high"> = {
  draft: "neutral",
  submitted: "info",
  under_review: "info",
  approved: "info",
  partially_recovered: "medium",
  recovered: "success",
  rejected: "high",
  written_off: "neutral",
};

// Mirrors backend claims_recovery.services.ledger.FORWARD_TRANSITIONS.
const FORWARD: Record<ClaimLedgerStatus, ClaimLedgerStatus[]> = {
  draft: ["submitted"],
  submitted: ["under_review"],
  under_review: ["approved"],
  approved: ["partially_recovered", "recovered"],
  partially_recovered: ["recovered"],
  recovered: [],
  rejected: [],
  written_off: [],
};
const TERMINAL_ALTERNATIVES: ClaimLedgerStatus[] = ["rejected", "written_off"];
export const TERMINAL = new Set<ClaimLedgerStatus>(["recovered", "rejected", "written_off"]);

export function nextStatuses(status: ClaimLedgerStatus): ClaimLedgerStatus[] {
  if (TERMINAL.has(status)) return [];
  return [...FORWARD[status], ...TERMINAL_ALTERNATIVES];
}

export function formatMoney(value: string, currency: string) {
  const n = Number(value);
  const amount = Number.isNaN(n) ? value : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currency} ${amount}`;
}
