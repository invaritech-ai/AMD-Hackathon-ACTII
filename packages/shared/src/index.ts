// ── Locked API Contract Types ──

export type DocType = "invoice" | "purchase_order" | "contract" | "delivery_docket" | "unknown";

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

export interface LedgerEntry {
  supplier_name: string;
  total_discrepancies: number;
  total_claim_value: number;
  claims_count: number;
}

export interface LedgerResponse {
  total_claims: number;
  total_claim_value: number;
  by_supplier: LedgerEntry[];
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
