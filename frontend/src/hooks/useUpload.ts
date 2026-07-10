import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useUpload() {
  return useMutation({
    mutationFn: async (files: File[]) => {
      const document_ids: string[] = [];
      for (const file of files) {
        const doc = await api.uploadDocument(file);
        document_ids.push(doc.document_id);
      }
      const run = await api.createRun(document_ids);
      return { run_id: run.id, document_count: document_ids.length };
    },
  });
}
