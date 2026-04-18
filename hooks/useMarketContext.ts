import { useQuery } from "@tanstack/react-query";

export interface MarketContext {
  marketCapChangePercent24h: number;
  btcDominance: number;
  totalMarketCapUSD: number;
  totalVolumeUSD: number;
}

export function useMarketContext() {
  return useQuery<MarketContext>({
    queryKey: ["market-context"],
    queryFn: async () => {
      const res = await fetch("/api/market-context");
      if (!res.ok) throw new Error("Failed to fetch market context");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
