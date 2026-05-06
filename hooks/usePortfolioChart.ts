"use client";

import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  buildPortfolioTimeSeries,
  extractNativeEvents,
  extractTokenEvents,
  reconstructBalanceTimeline,
  type PortfolioBreakdownEntry,
  type TokenSeriesInput,
} from "@/lib/portfolioHistory";
import type { TransferHistoryPayload } from "@/app/api/transfer-history/route";

/**
 * Builds a true historical portfolio value time series.
 *
 * Pipeline (replaces the legacy `current balance × historical price`
 * estimate, which was wrong by construction whenever the user had ever
 * traded or transferred):
 *
 *   1. Fetch the full wallet transfer history once per address.
 *   2. Fetch a CoinGecko price chart for each held token's coingeckoId
 *      (existing /api/token-chart route; cached server-side per range).
 *   3. For each token, derive a signed-delta event stream from the
 *      transfer log, then reconstruct a balance timeline anchored on
 *      the known current balance.
 *   4. For every timestamp on the densest price grid, sum
 *        Σ balance(token, t) × price(token, t)
 *      across all tokens. Tokens not yet acquired contribute 0; tokens
 *      with missing price data are skipped silently.
 *
 * Return shape preserved: `{ data: [ts, value][], isLoading }`. An
 * additional optional `breakdown` field surfaces per-token contribution
 * to USD change over the visible window — drives no UI by default.
 */

export interface PortfolioHolding {
  coingeckoId: string;
  /** Current token-unit balance — used to anchor the reconstructed timeline. */
  amount: number;
  /** Optional symbol for breakdown labeling. */
  symbol?: string;
  /**
   * ERC-20 contract address. Required for ERC-20 tokens so we can pick
   * out the right Transfer events. Omit for the chain's native asset.
   */
  contractAddress?: string;
  /** "native" = chain gas token (e.g. ETH); "erc20" otherwise. */
  kind?: "native" | "erc20";
}

interface ChartResult {
  data: [number, number][] | null;
  isLoading: boolean;
  breakdown?: PortfolioBreakdownEntry[];
}

export function usePortfolioChart(
  holdings: PortfolioHolding[],
  days: number | "max",
  address: string | null,
): ChartResult {
  // Skip dust — anything below a strict positive amount has no signal.
  const meaningful = holdings.filter((h) => h.amount > 0);

  // ── 1. Transfer history (once per address) ───────────────────────
  const transferHistoryQuery = useQuery<TransferHistoryPayload>({
    queryKey: ["transfer-history", address?.toLowerCase() ?? null],
    enabled: !!address,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
    queryFn: async () => {
      const res = await fetch(
        `/api/transfer-history?address=${encodeURIComponent(address!)}`,
      );
      if (!res.ok) throw new Error(`transfer-history ${res.status}`);
      return (await res.json()) as TransferHistoryPayload;
    },
  });

  // ── 2. Historical prices (one query per held token) ──────────────
  const priceQueries = useQueries({
    queries: meaningful.map((h) => ({
      queryKey: ["token-chart", h.coingeckoId, days] as const,
      queryFn: async () => {
        const res = await fetch(
          `/api/token-chart?id=${encodeURIComponent(h.coingeckoId)}&days=${days}`,
        );
        const d = await res.json();
        const prices = (d.prices ?? []) as [number, number][];
        if (prices.length === 0) {
          throw new Error(
            `Empty chart data for ${h.coingeckoId} — likely rate-limited`,
          );
        }
        return { coingeckoId: h.coingeckoId, prices };
      },
      staleTime: days === 1 ? 60_000 : days === "max" ? 600_000 : 300_000,
      retry: 2,
      retryDelay: (attempt: number) => Math.min(2000 * (attempt + 1), 8000),
    })),
  });

  // ── 3. Heavy work: reconstruct + aggregate, memoized ─────────────
  // We key the memo on stable digests of the inputs so identity-only
  // re-renders (parent components rebuilding `holdings` array refs)
  // don't re-run the O(N) reconstruction. The dep array is fixed length.

  const transferData = transferHistoryQuery.data;

  // Digest of the price-query payloads — picks up new fetches but not refs.
  const priceDigest = useMemo(
    () =>
      priceQueries
        .map((q) =>
          q.data
            ? `${q.data.coingeckoId}:${q.data.prices.length}:${q.data.prices[0]?.[0] ?? 0}:${q.data.prices[q.data.prices.length - 1]?.[0] ?? 0}`
            : "x",
        )
        .join("|"),
    [priceQueries],
  );

  const holdingsDigest = useMemo(
    () =>
      meaningful
        .map(
          (h) =>
            `${h.coingeckoId}:${h.amount}:${h.contractAddress ?? ""}:${h.kind ?? ""}`,
        )
        .join("|"),
    [meaningful],
  );

  const computed = useMemo(() => {
    if (!address || !transferData) return null;

    const inputs: TokenSeriesInput[] = [];
    for (let i = 0; i < meaningful.length; i++) {
      const h = meaningful[i];
      const priceQ = priceQueries[i];
      // Need a price series to plot anything for this token.
      if (!priceQ?.data) continue;

      const isNative = h.kind === "native" || !h.contractAddress;
      const events = isNative
        ? extractNativeEvents(transferData.txs, transferData.internalTxs, address)
        : extractTokenEvents(transferData.tokenTxs, address, h.contractAddress!);

      const checkpoints = reconstructBalanceTimeline(events, h.amount);

      inputs.push({
        coingeckoId: h.coingeckoId,
        symbol: h.symbol,
        checkpoints,
        prices: priceQ.data.prices,
      });
    }

    if (inputs.length === 0) return null;
    return buildPortfolioTimeSeries(inputs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, transferData, priceDigest, holdingsDigest, days]);

  // ── 4. Loading / output state ────────────────────────────────────
  const someLoading =
    transferHistoryQuery.isLoading || priceQueries.some((q) => q.isLoading);

  if (!computed || computed.series.length === 0) {
    return { data: null, isLoading: someLoading };
  }

  return {
    data: computed.series,
    isLoading: false,
    breakdown: computed.breakdown,
  };
}
