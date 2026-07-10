import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useRunStatus(runId: string | undefined) {
  return useQuery({
    queryKey: ["run", runId],
    queryFn: () => api.getRun(runId!),
    enabled: !!runId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "processing") return 2000;
      return false;
    },
  });
}
