"use client";

import { useQuery } from "@tanstack/react-query";
import { useWatchlistStore } from "@/store/watchlistStore";

export interface WatchPrice {
  priceUSD: number;
  change24h: number;
}

/**
 * Fetches live prices for all watched tokens.
 * Uses the same /api/prices endpoint — passes watched IDs as query param
 * so the server merges them with the default set in one CoinGecko request.
 *
 * Returns a map of coingeckoId → { priceUSD, change24h }.
 */
export function useWatchlistPrices(): Record<string, WatchPrice> {
  const tokens = useWatchlistStore((s) => s.tokens);
  const ids = tokens.map((t) => t.id);

  const { data } = useQuery({
    queryKey: ["watchlist-prices", ids.join(",")],
    queryFn: async () => {
      if (ids.length === 0) return {};
      const res = await fetch(`/api/prices?ids=${ids.join(",")}`);
      if (!res.ok) return {};
      return res.json() as Promise<
        Record<string, { usd: number; usd_24h_change: number }>
      >;
    },
    enabled: ids.length > 0,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  const result: Record<string, WatchPrice> = {};
  if (data) {
    for (const id of ids) {
      const entry = data[id];
      if (entry) {
        result[id] = { priceUSD: entry.usd ?? 0, change24h: entry.usd_24h_change ?? 0 };
      }
    }
  }
  return result;
}
