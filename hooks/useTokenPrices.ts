"use client";

import { useQuery } from "@tanstack/react-query";
import { FALLBACK_PRICES, type PriceMap } from "@/lib/prices";

async function fetchPrices(): Promise<PriceMap> {
  // Use our server-side proxied route to avoid CORS/rate-limit issues
  const res = await fetch("/api/prices");
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
