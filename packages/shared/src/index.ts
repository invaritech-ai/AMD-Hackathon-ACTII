// ── Locked API Contract Types ──

export type DocType =
  | "invoice"
  | "purchase_order"
  | "contract"
  | "delivery_docket"
  | "remittance_advice"
  | "promo_agreement"
  | "unknown";

export interface DocumentUploadResponse {
  document_id: string;
  filename: string;
  type: DocType;
  status: string;
}

export interface DocumentDetail {
  id: string;
  filename: string;
  type: DocType;
  status: string;
  extracted_text: string | null;
  extracted_json: Record<string, unknown> | null;
  created_at: string;
}

export type AgentId = "agent1_ocr" | "agent2_po_match" | "agent3_contract" | "agent4_aggregate" | "agent5_claims";

export type AgentStatusValue = "pending" | "running" | "completed" | "skipped" | "failed";

export interface AgentStatus {
  agent_id: AgentId;
  name: string;
  status: AgentStatusValue;
  started_at: string | null;
  completed_at: string | null;
  output?: unknown;
}

export type DiscrepancyType =
  | "PRICE_MISMATCH"
  | "QTY_MISMATCH"
  | "UNAUTHORIZED_CHARGE"
  | "DUPLICATE"
  | "OVERCHARGE"
  | "UNDERCHARGE";

export type Severity = "LOW" | "MEDIUM" | "HIGH";

export interface Discrepancy {
  invoice_number: string;
  po_number: string | null;
  item_description: string;
  expected_quantity: number | null;
  actual_quantity: number | null;
  expected_unit_price: number | null;
  actual_unit_price: number | null;
  difference_amount: number;
  discrepancy_type: DiscrepancyType;
  severity: Severity;
  explanation: string | null;
}

export type ClaimStatus = "DRAFT" | "SUBMITTED" | "ACCEPTED" | "PAID";

export interface RecoveryClaim {
  claim_number: string;
  invoice_number: string;
  po_number: string | null;
  total_claim_amount: number;
  draft_text: string | null;
  claim_date: string | null;
  status: ClaimStatus;
}

export type RunStatus = "pending" | "running" | "completed" | "failed";

export interface RunResponse {
  id: string;
  status: RunStatus;
  progress_pct: number;
  invoice_number: string | null;
  supplier_name: string | null;
  total_discrepancies: number | null;
  total_claim_value: number | null;
  agents: AgentStatus[];
  discrepancies: Discrepancy[];
  claims: RecoveryClaim[];
  created_at: string;
  error_message: string | null;
}

export interface RunSummary {
  id: string;
  status: string;
  invoice_number: string | null;
  supplier_name: string | null;
  total_discrepancies: number | null;
  total_claim_value: number | null;
  created_at: string;
}

// ── Case Ledger (claim lifecycle) ──
// Mirrors the backend contract: decimal money values are serialized as strings,
// statuses are lowercase.

export type ClaimLedgerStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "partially_recovered"
  | "recovered"
  | "rejected"
  | "written_off";

export interface ClaimStatusEvent {
  id: string;
  from_status: string | null;
  to_status: string;
  recovered_amount: string;
  note: string | null;
  created_at: string;
}

export interface LedgerCase {
  case_id: string;
  claim_id: string;
  title: string | null;
  status: ClaimLedgerStatus;
  currency: string;
  claim_amount: string;
  recovered_amount: string;
  outstanding_amount: string;
  exception_count: number;
  created_at: string;
  updated_at: string;
  history: ClaimStatusEvent[];
}

export interface LedgerCurrencySummary {
  currency: string;
  claim_count: number;
  total_claimed: string;
  total_recovered: string;
  total_outstanding: string;
  status_counts: Record<string, number>;
}

export interface LedgerResponse {
  summaries: LedgerCurrencySummary[];
  cases: LedgerCase[];
}

export interface LedgerUpdateRequest {
  status: ClaimLedgerStatus;
  recovered_amount?: number | null;
  note?: string | null;
}

// ── Case Graph (slice 3) ──

export interface GraphNode {
  id: string;
  type: DocType;
  filename: string;
  ids: string[];
  case_id: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  shared_ids: string[];
}

export interface GraphCase {
  case_id: string;
  document_ids: string[];
  shared_ids: string[];
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  cases: GraphCase[];
}

export interface CaseSummary {
  case_id: string;
  title: string | null;
  status: string;
  document_count: number;
  shared_ids: string[];
}

export interface DocumentSummary {
  id: string;
  filename: string;
  type: DocType;
  status: string;
  case_ids: string[];
  ids: string[];
  created_at: string;
  size_bytes: number;
}

export interface CaseExceptionResponse {
  id: string;
  document_id: string | null;
  check_type: string;
  severity: string;
  expected_value: string | null;
  actual_value: string | null;
  delta: string | null;
  currency: string | null;
  explanation: string | null;
  status: string;
}

export interface CaseClaimResponse {
  id: string;
  total_amount: string;
  currency: string | null;
  draft_text: string | null;
  status: string;
}

export interface ReconciliationResponse {
  case_id: string;
  reconciliation_id: string | null;
  status: "ok" | "exceptions_found";
  summary: string | null;
  total_recoverable: string;
  currency: string | null;
  exceptions: CaseExceptionResponse[];
  claim: CaseClaimResponse | null;
}

// ── Upload (legacy compat) ──

export interface UploadResponse {
  run_id: string;
}

export interface RunsResponse {
  runs: RunSummary[];
}

// ── Deprecated — removed from contract ──

/** @deprecated Use DocType */
export type DocumentType = DocType;
/** @deprecated Use ClaimStatus */
export type ClaimStatusLegacy = ClaimStatus;
