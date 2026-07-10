import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useDiscrepancies(runId: string | undefined) {
  const query = useQuery({
    queryKey: ["run", runId],
    queryFn: () => api.getRun(runId!),
    enabled: !!runId,
  });

  return {
    ...query,
    data: query.data?.discrepancies ?? [],
    run: query.data ?? null,
  };
}
