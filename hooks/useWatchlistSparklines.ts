"use client";

import { useQuery } from "@tanstack/react-query";

export function useWatchlistSparklines(ids: string[]): Record<string, number[]> {
  const { data } = useQuery({
    queryKey: ["watchlist-sparklines", ids.join(",")],
    queryFn: async () => {
      if (ids.length === 0) return {};
      const res = await fetch(`/api/sparklines?ids=${ids.join(",")}`);
      if (!res.ok) return {};
      return res.json() as Promise<Record<string, number[]>>;
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry: 1,
  });
  return data ?? {};
}
