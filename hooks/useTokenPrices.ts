"use client";

import { useQuery } from "@tanstack/react-query";
import { FALLBACK_PRICES, type PriceMap } from "@/lib/prices";
import { ALL_TOKEN_CG_IDS } from "@/lib/searchTokens";
import { COINGECKO_IDS } from "@/lib/chains";

// All CoinGecko IDs — chain native tokens + every World Chain ERC-20 (swappable + display-only).
// Fetched in one request, cached for 60s.
const ALL_IDS = [...new Set([...COINGECKO_IDS, ...ALL_TOKEN_CG_IDS])].join(",");

async function fetchPrices(): Promise<PriceMap> {
  const res = await fetch(`/api/prices?ids=${encodeURIComponent(ALL_IDS)}`);
  if (!res.ok) return FALLBACK_PRICES;
  return res.json();
}

export function useTokenPrices() {
  return useQuery<PriceMap>({
    queryKey: ["token-prices"],
    queryFn: fetchPrices,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 2,
  });
}
