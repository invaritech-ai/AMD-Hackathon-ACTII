import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useGraph() {
  return useQuery({
    queryKey: ["graph"],
    queryFn: () => api.getGraph(),
    staleTime: 5000,
  });
}
