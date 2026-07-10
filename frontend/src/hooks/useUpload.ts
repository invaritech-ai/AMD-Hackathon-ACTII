import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useUpload() {
  return useMutation({
    mutationFn: (files: File[]) => api.uploadInvoice(files),
  });
}
