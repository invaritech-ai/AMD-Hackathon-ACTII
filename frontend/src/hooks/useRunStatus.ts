import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { RunResponse } from "@claims/shared";

export function useRunStatus(runId: string | undefined) {
  return useQuery<RunResponse>({
    queryKey: ["run", runId],
    queryFn: () => api.getRun(runId!),
    enabled: !!runId,
    refetchInterval: (query) => {
      if (query.state.data?.status === "running" || query.state.data?.status === "pending") {
        return 2000;
      }
      return false;
    },
  });
}
