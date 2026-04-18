"use client";

import { useQuery } from "@tanstack/react-query";

export interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  marketCapRank: number | null;
  priceChange24h: number | null;
}

export interface TrendingCategory {
  id: number;
  name: string;
  marketCapChange24h: number | null;
}

export interface MarketNews {
  coins: TrendingCoin[];
  categories: TrendingCategory[];
}

export function useMarketNews() {
  return useQuery<MarketNews>({
    queryKey: ["market-news"],
    queryFn: async () => {
      const res = await fetch("/api/market-news");
      return res.json();
    },
    staleTime: 10 * 60_000,
    refetchInterval: 10 * 60_000,
  });
}
