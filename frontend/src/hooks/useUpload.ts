import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useProcessingQueueStore, type ProcessingStage } from "@/store/processingQueueStore";

const terminalStages = new Set<ProcessingStage>(["classified", "failed"]);

async function waitForDocument(
  documentId: string,
  updateQueueItem: (patch: { stage: ProcessingStage; progress: number; error?: string }) => void
) {
  while (true) {
    const doc = await api.getDocument(documentId);
    const stage = doc.status === "error" ? "failed" : doc.status as ProcessingStage;
    const progress = stage === "queued" ? 10 : stage === "extracting" ? 45 : stage === "analyzing" ? 80 : 100;
    updateQueueItem({ stage, progress, error: stage === "failed" ? `Processing failed: ${documentId}` : undefined });
    if (terminalStages.has(stage)) return { ...doc, status: stage };
    await new Promise((r) => setTimeout(r, 1000));
  }
}

export function useUpload() {
  const queryClient = useQueryClient();
  const addFiles = useProcessingQueueStore((state) => state.addFiles);
  const updateItem = useProcessingQueueStore((state) => state.updateItem);

  return useMutation({
    mutationFn: async (files: File[]) => {
      const queueItems = addFiles(files);
      const uploadResults = await Promise.all(queueItems.map(async (item, index) => {
        try {
          const response = await api.uploadDocumentWithProgress(files[index], (progress) => updateItem(item.id, { progress }));
          updateItem(item.id, { documentId: response.document_id, stage: "queued", progress: 10 });
          const document = await waitForDocument(response.document_id, (patch) => updateItem(item.id, patch));
          return { documentId: response.document_id, failed: document.status === "failed" };
        } catch (error) {
          updateItem(item.id, { stage: "failed", progress: 100, error: error instanceof Error ? error.message : "Upload failed" });
          return { documentId: null, failed: true };
        }
      }));

      const documentIds = uploadResults.flatMap((result) => result.documentId && !result.failed ? [result.documentId] : []);
      if (documentIds.length === 0) throw new Error("No documents completed preprocessing");

      const run = await api.createRun(documentIds);
      return { run_id: run.id, document_count: documentIds.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graph"] });
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });
}
