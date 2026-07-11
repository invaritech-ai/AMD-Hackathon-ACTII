import { useQuery } from "@tanstack/react-query";
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

