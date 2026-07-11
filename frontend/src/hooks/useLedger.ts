import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LedgerUpdateRequest } from "@claims/shared";
import { api } from "@/lib/api";

export function useLedger() {
  return useQuery({
    queryKey: ["ledger"],
    queryFn: api.getLedger,
    staleTime: 5000,
  });
}

export function useUpdateCaseLedger() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseId, ...body }: { caseId: string } & LedgerUpdateRequest) => api.updateCaseLedger(caseId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
  });
}
