"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";

// ─── Market data ─────────────────────────────────────────────────────────────

export interface TokenMarketData {
  price:             number | null;
  marketCap:         number | null;
  volume24h:         number | null;
  circulatingSupply: number | null;
  totalSupply:       number | null;
  ath:               number | null;
  athDate:           string | null;
  website:           string | null;
}

export function useTokenMarket(coingeckoId: string) {
  return useQuery<TokenMarketData>({
    queryKey: ["token-market", coingeckoId],
    queryFn: async () => {
      // API always returns HTTP 200 — either live data or null-valued fallback.
      const res = await fetch(`/api/token-market?id=${encodeURIComponent(coingeckoId)}`);
      return res.json();
    },
    staleTime:       120_000,
    refetchInterval: 120_000,
    retry: 1,
  });
}

// ─── Chart data ───────────────────────────────────────────────────────────────
// Returns an array of [timestamp, price] pairs from CoinGecko market_chart.
// CoinGecko auto-selects granularity based on days:
//   1  day  → ~5-minute intervals  (~288 points)
//   7  days → hourly intervals     (~168 points)
//   30 days → daily intervals      (~30 points)
//  365 days → daily intervals      (~365 points)
//  "max"    → daily intervals      (full history)

export function useTokenChart(coingeckoId: string, days: number | "max") {
  return useQuery<[number, number][]>({
    queryKey: ["token-chart", coingeckoId, days],
    queryFn: async () => {
      const res = await fetch(
        `/api/token-chart?id=${encodeURIComponent(coingeckoId)}&days=${days}`
      );
      const d = await res.json();
      const prices = (d.prices ?? []) as [number, number][];
      if (prices.length === 0) {
        throw new Error("Empty chart data — likely rate-limited");
      }
      return prices;
    },
    staleTime: days === 1 ? 60_000 : days === "max" ? 600_000 : 300_000,
    // Keep the previous range's chart visible while loading the new range —
    // prevents the skeleton flash when switching between ranges.
    placeholderData: keepPreviousData,
    retry: 3,
    retryDelay: (attempt) => Math.min(2000 * (attempt + 1), 10000),
  });
}
