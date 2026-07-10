import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

async function waitForDocument(documentId: string, signal?: AbortSignal) {
  while (true) {
    if (signal?.aborted) throw new Error("Upload cancelled");
    const doc = await api.getDocument(documentId);
    if (doc.status === "classified" || doc.status === "failed") return doc;
    if (doc.status === "error") throw new Error(`Document processing failed: ${documentId}`);
    await new Promise((r) => setTimeout(r, 1000));
  }
}

export function useUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      const documentIds: string[] = [];
      const uploadResults = await Promise.all(
        files.map((file) => api.uploadDocument(file))
      );
      documentIds.push(...uploadResults.map((d) => d.document_id));

      await Promise.all(
        documentIds.map((id) => waitForDocument(id))
      );

      const run = await api.createRun(documentIds);
      return { run_id: run.id, document_count: documentIds.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graph"] });
    },
  });
}