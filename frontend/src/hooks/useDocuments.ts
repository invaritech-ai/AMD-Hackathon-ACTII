import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DocType } from "@claims/shared";
import { api, type DocumentListFilters } from "@/lib/api";

const documentsKey = (filters: DocumentListFilters) => [
  "documents",
  filters.query ?? "",
  filters.type ?? "all",
  filters.caseId ?? "",
  filters.unassigned ? "unassigned" : "all",
  filters.excludeCase ?? "",
] as const;

export function useDocuments(filters: {
  query?: string;
  type?: DocType;
  caseId?: string;
  unassigned?: boolean;
  excludeCase?: string;
}) {
  const normalizedFilters: DocumentListFilters = {
    query: filters.query?.trim() || undefined,
    type: filters.type,
    caseId: filters.caseId,
    unassigned: filters.unassigned,
    excludeCase: filters.excludeCase,
  };

  return useQuery({
    queryKey: documentsKey(normalizedFilters),
    queryFn: () => api.getDocuments(normalizedFilters),
    staleTime: 5000,
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => api.deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["case-graph"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["graph"] });
    },
  });
}

