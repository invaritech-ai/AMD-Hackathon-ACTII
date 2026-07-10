import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useClaims(runId: string | undefined) {
  const query = useQuery({
    queryKey: ["run", runId],
    queryFn: () => api.getRun(runId!),
    enabled: !!runId,
  });

  return {
    ...query,
    data: query.data?.claims?.[0] ?? null,
    run: query.data ?? null,
  };
}
