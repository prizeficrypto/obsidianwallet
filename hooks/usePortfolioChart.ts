"use client";

import { useQueries } from "@tanstack/react-query";

/**
 * Builds an approximate portfolio value time series by fetching
 * historical prices for each held token and weighting by current
 * holdings.
 *
 * Limitation: assumes current holdings were held for the entire
 * period. Won't reflect past trades or deposits.
 */

export interface PortfolioHolding {
  coingeckoId: string;
  amount: number; // token units held now
}

export function usePortfolioChart(
  holdings: PortfolioHolding[],
  days: number | "max",
) {
  // Only fetch for meaningful holdings (skip dust)
  const meaningful = holdings.filter((h) => h.amount > 0);

  const queries = useQueries({
    queries: meaningful.map((h) => ({
      queryKey: ["token-chart", h.coingeckoId, days] as const,
      queryFn: async () => {
        const res = await fetch(
          `/api/token-chart?id=${encodeURIComponent(h.coingeckoId)}&days=${days}`,
        );
        const d = await res.json();
        const prices = (d.prices ?? []) as [number, number][];
        if (prices.length === 0) {
          throw new Error(`Empty chart data for ${h.coingeckoId} — likely rate-limited`);
        }
        return {
          coingeckoId: h.coingeckoId,
          amount: h.amount,
          prices,
        };
      },
      staleTime: days === 1 ? 60_000 : days === "max" ? 600_000 : 300_000,
      retry: 2,
      retryDelay: (attempt: number) => Math.min(2000 * (attempt + 1), 8000),
    })),
  });

  const someLoading = queries.some((q) => q.isLoading);
  const allData = queries
    .map((q) => q.data)
    .filter((d): d is NonNullable<typeof d> => !!d && Array.isArray(d.prices) && d.prices.length > 0);

  // Show loading only when we have NO data at all yet
  if (allData.length === 0) {
    return { data: null, isLoading: someLoading };
  }

  // Find the series with the most data points to use as the time base
  const baseSeries = allData.reduce((best, s) =>
    s.prices.length > best.prices.length ? s : best,
  );

  // Build combined portfolio value at each timestamp in the base series
  const combined: [number, number][] = baseSeries.prices.map(([ts]) => {
    let totalValue = 0;

    for (const series of allData) {
      // Find the closest price point to this timestamp
      const price = findNearestPrice(series.prices, ts);
      if (price !== null) {
        totalValue += price * series.amount;
      }
    }

    return [ts, totalValue];
  });

  return { data: combined, isLoading: false };
}

/**
 * Binary search for the nearest price to a target timestamp.
 */
function findNearestPrice(
  prices: [number, number][],
  targetTs: number,
): number | null {
  if (prices.length === 0) return null;
  if (prices.length === 1) return prices[0][1];

  let lo = 0;
  let hi = prices.length - 1;

  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (prices[mid][0] <= targetTs) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  // Return the closer of lo and hi
  const dLo = Math.abs(prices[lo][0] - targetTs);
  const dHi = Math.abs(prices[hi][0] - targetTs);
  return dLo <= dHi ? prices[lo][1] : prices[hi][1];
}
