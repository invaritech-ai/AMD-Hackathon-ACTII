export interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
  tax_rate?: number;
}

export interface Discrepancy {
  invoice_number: string;
  po_number: string;
  item_description: string;
  expected_quantity: number;
  actual_quantity: number;
  expected_unit_price: number;
  actual_unit_price: number;
  difference_amount: number;
  discrepancy_type: "OVERCHARGE" | "UNDERCHARGE" | "QTY_MISMATCH" | "DUPLICATE" | "PRICE_MISMATCH" | "UNAUTHORIZED_CHARGE";
  severity: "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "DRAFTING_CLAIM" | "CLAIM_SUBMITTED";
  explanation?: string;
}

export interface RecoveryClaim {
  claim_number: string;
  invoice_number: string;
  po_number: string;
  discrepancies: Discrepancy[];
  total_claim_amount: number;
  claim_date: string;
  retailer_ref?: string;
  status: "DRAFT" | "SUBMITTED" | "ACCEPTED" | "PAID";
  claim_text?: string;
}

export interface AgentStatus {
  agent_id: number;
  name: string;
  status: "pending" | "processing" | "done" | "error";
  started_at?: string;
  completed_at?: string;
  error?: string;
}

export interface PipelineRun {
  id: string;
  invoice_number: string;
  supplier_name: string;
  status: "processing" | "done" | "error";
  agents: AgentStatus[];
  discrepancies: Discrepancy[];
  claim: RecoveryClaim | null;
  uploaded_at: string;
  completed_at?: string;
}

export interface RunSummary {
  id: string;
  invoice_number: string;
  supplier_name: string;
  status: "processing" | "done" | "error";
  total_discrepancies: number;
  total_claim_value: number;
  uploaded_at: string;
}

export interface UploadResponse {
  run_id: string;
}

export interface RunsResponse {
  runs: RunSummary[];
}
