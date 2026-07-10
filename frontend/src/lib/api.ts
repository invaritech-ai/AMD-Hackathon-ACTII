import type { UploadResponse, PipelineRun, RunsResponse } from "@claims/shared";

const BASE_URL = "/api";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body || res.statusText);
  }

  return res.json();
}

export const api = {
  uploadInvoice: async (files: File[]): Promise<UploadResponse> => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    const res = await fetch(`${BASE_URL}/invoices`, { method: "POST", body: formData });
    if (!res.ok) {
      const body = await res.text();
      throw new ApiError(res.status, body || res.statusText);
    }
    return res.json();
  },

  getRun: (runId: string) => request<PipelineRun>(`/runs/${runId}`),

  getRuns: () => request<RunsResponse>("/runs"),
};

export { ApiError };
