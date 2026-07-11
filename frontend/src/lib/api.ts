import type {
  DocumentUploadResponse,
  DocumentDetail,
  RunResponse,
  RunSummary,
  LedgerResponse,
  GraphResponse,
  CaseSummary,
  DocumentSummary,
  DocType,
  ReconciliationResponse,
} from "@claims/shared";

const BASE_URL = "/api/v1";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface DocumentListFilters {
  query?: string;
  type?: DocType;
  caseId?: string;
  unassigned?: boolean;
  excludeCase?: string;
}

export const api = {
  uploadDocumentWithProgress: (
    file: File,
    onProgress: (progress: number) => void
  ): Promise<DocumentUploadResponse> =>
    new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);
      request.open("POST", `${BASE_URL}/documents/upload`);
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
      };
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          resolve(JSON.parse(request.responseText) as DocumentUploadResponse);
          return;
        }
        reject(new ApiError(request.status, request.responseText || request.statusText));
      };
      request.onerror = () => reject(new Error("Network error while uploading document"));
      request.send(formData);
    }),

  uploadDocument: async (file: File): Promise<DocumentUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE_URL}/documents/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new ApiError(res.status, body || res.statusText);
    }
    return res.json();
  },

  getDocument: (documentId: string): Promise<DocumentDetail> =>
    request<DocumentDetail>(`/documents/${documentId}`),

  createRun: (documentIds: string[]): Promise<RunResponse> =>
    request<RunResponse>("/runs", {
      method: "POST",
      body: JSON.stringify({ document_ids: documentIds }),
    }),

  getRun: (runId: string): Promise<RunResponse> =>
    request<RunResponse>(`/runs/${runId}`),

  getRuns: (): Promise<RunSummary[]> =>
    request<RunSummary[]>("/runs"),

  getLedger: (): Promise<LedgerResponse> =>
    request<LedgerResponse>("/ledger"),

  getGraph: (): Promise<GraphResponse> =>
    request<GraphResponse>("/documents/graph"),

  getCases: (): Promise<CaseSummary[]> =>
    request<CaseSummary[]>("/cases"),

  getCaseGraph: (caseId: string): Promise<GraphResponse> =>
    request<GraphResponse>(`/cases/${caseId}/graph`),

  attachDocument: (caseId: string, documentId: string): Promise<GraphResponse> =>
    request<GraphResponse>(`/cases/${caseId}/documents`, {
      method: "POST",
      body: JSON.stringify({ document_id: documentId }),
    }),

  detachDocument: (caseId: string, documentId: string): Promise<void> =>
    request<void>(`/cases/${caseId}/documents/${documentId}`, { method: "DELETE" }),

  getReconciliation: (caseId: string): Promise<ReconciliationResponse> =>
    request<ReconciliationResponse>(`/cases/${caseId}/reconciliation`),

  runReconciliation: (caseId: string): Promise<ReconciliationResponse> =>
    request<ReconciliationResponse>(`/cases/${caseId}/reconcile`, { method: "POST" }),

  getDocuments: (filters: DocumentListFilters = {}): Promise<DocumentSummary[]> => {
    const params = new URLSearchParams();
    if (filters.query) params.set("query", filters.query);
    if (filters.type) params.set("type", filters.type);
    if (filters.caseId) params.set("case_id", filters.caseId);
    if (filters.unassigned) params.set("unassigned", "true");
    if (filters.excludeCase) params.set("exclude_case", filters.excludeCase);
    const query = params.toString();
    return request<DocumentSummary[]>(`/documents${query ? `?${query}` : ""}`);
  },

  deleteDocument: (documentId: string): Promise<void> =>
    request<void>(`/documents/${documentId}`, { method: "DELETE" }),
};
