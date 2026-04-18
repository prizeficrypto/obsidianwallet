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
  // Skip fetching for sentinel values or contract addresses
  const enabled = !!coingeckoId && coingeckoId !== "__skip__" && !coingeckoId.startsWith("0x");

  return useQuery<TokenMarketData>({
    queryKey: ["token-market", coingeckoId],
    enabled,
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
  // Skip fetch entirely if there's no valid CoinGecko ID
  const hasValidId = !!coingeckoId && !coingeckoId.startsWith("0x");

  return useQuery<[number, number][]>({
    queryKey: ["token-chart", coingeckoId, days],
    enabled: hasValidId,
    queryFn: async () => {
      const res = await fetch(
        `/api/token-chart?id=${encodeURIComponent(coingeckoId)}&days=${days}`
      );
      if (!res.ok) return [];
      const d = await res.json();
      const prices = (d.prices ?? []) as [number, number][];
      // Return empty array — InteractiveLineChart shows "no data" gracefully
      return prices;
    },
    staleTime: days === 1 ? 60_000 : days === "max" ? 600_000 : 300_000,
    // Keep the previous range's chart visible while loading the new range —
    // prevents the skeleton flash when switching between ranges.
    placeholderData: keepPreviousData,
    retry: 1,
  });
}

