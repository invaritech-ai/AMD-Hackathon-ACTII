import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const caseGraphKey = (caseId: string | null) => ["case-graph", caseId] as const;

export function useCases() {
  return useQuery({
    queryKey: ["cases"],
    queryFn: api.getCases,
    staleTime: 5000,
  });
}

export function useCaseGraph(caseId: string | null) {
  return useQuery({
    queryKey: caseGraphKey(caseId),
    queryFn: () => api.getCaseGraph(caseId!),
    enabled: caseId !== null,
    staleTime: 5000,
  });
}

export function useAttachDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseId, documentId }: { caseId: string; documentId: string }) => api.attachDocument(caseId, documentId),
    onSuccess: (graph, { caseId }) => {
      queryClient.setQueryData(caseGraphKey(caseId), graph);
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation", caseId] });
    },
  });
}

export function useDetachDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseId, documentId }: { caseId: string; documentId: string }) => api.detachDocument(caseId, documentId),
    onSuccess: (_result, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["case-graph", caseId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation", caseId] });
    },
  });
}

export function useCaseReconciliation(caseId: string | null) {
  return useQuery({
    queryKey: ["reconciliation", caseId],
    queryFn: () => api.getReconciliation(caseId!),
    enabled: caseId !== null,
    staleTime: 5000,
  });
}

export function useRunReconciliation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (caseId: string) => api.runReconciliation(caseId),
    onSuccess: (reconciliation, caseId) => {
      queryClient.setQueryData(["reconciliation", caseId], reconciliation);
      queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
  });
}
