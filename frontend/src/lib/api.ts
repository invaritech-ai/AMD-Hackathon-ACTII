import type {
  DocumentUploadResponse,
  DocumentDetail,
  RunResponse,
  RunSummary,
  LedgerResponse,
  GraphResponse,
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
  return res.json();
}

export const api = {
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
};
