"use client";

import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { CHAINS, type ChainConfig } from "@/lib/chains";
import { getAdapter } from "@/adapters/registry";
import type { PriceMap } from "@/lib/prices";

export interface ChainBalance {
  chain: ChainConfig;
  nativeBalance: number;  // in token units
  usdValue: number;
  priceChange24h: number;
  isLoading: boolean;
  /** Set when this value is from a previous successful fetch, not the current one */
  isStale?: boolean;
  error?: string;
}

// ── Last-known-good cache ───────────────────────────────────────────
// Stores the last successfully fetched native balance per chain.
// Lives in module scope so it survives React Query refetches.
// Simple Map, not persistent — clears on page reload, which is fine
// because a fresh page load should show fresh data or loading state.
const lastKnownBalances = new Map<string, number>();

async function fetchChainNativeBalance(
  chain: ChainConfig,
  address: string
): Promise<{ balance: number; failed: boolean }> {
  // Skip non-EVM chains for EVM addresses (0x prefix)
  if (chain.type === "solana" || chain.type === "bitcoin") return { balance: 0, failed: false };
  if (chain.type !== "evm" || !chain.chainId) return { balance: 0, failed: false };

  const adapter = getAdapter(chain.id);
  if (!adapter) return { balance: 0, failed: false };

  try {
    const raw = await adapter.getNativeBalance(address);
    const balance = Number(formatUnits(raw, chain.decimals));
    // Store as last-known-good
    lastKnownBalances.set(chain.id, balance);
    return { balance, failed: false };
  } catch {
    // RPC failed — use last-known-good if available
    const cached = lastKnownBalances.get(chain.id);
    if (cached !== undefined) {
      return { balance: cached, failed: true };
    }
    // No cached value — this is a genuine unknown
    return { balance: 0, failed: true };
  }
}

export function useChainBalances(address: string | null, prices: PriceMap | undefined) {
  return useQuery<ChainBalance[]>({
    queryKey: ["chain-balances", address],
    enabled: !!address && !!prices,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
    queryFn: async () => {
      if (!address || !prices) return [];

      const results = await Promise.allSettled(
        CHAINS.map(async (chain) => {
          const { balance, failed } = await fetchChainNativeBalance(chain, address);
          const price = prices[chain.coingeckoId];
          const usdValue = balance * (price?.usd ?? 0);
          const priceChange24h = price?.usd_24h_change ?? 0;
          return {
            chain,
            nativeBalance: balance,
            usdValue,
            priceChange24h,
            isLoading: false,
            isStale: failed && balance > 0,
            error: failed ? "Failed to fetch" : undefined,
          } satisfies ChainBalance;
        })
      );

      const balances: ChainBalance[] = results.map((r, i) => {
        if (r.status === "fulfilled") return r.value;
        // Promise.allSettled rejection — shouldn't happen since fetchChainNativeBalance
        // catches internally, but handle defensively
        const cached = lastKnownBalances.get(CHAINS[i].id);
        const price = prices?.[CHAINS[i].coingeckoId];
        return {
          chain: CHAINS[i],
          nativeBalance: cached ?? 0,
          usdValue: (cached ?? 0) * (price?.usd ?? 0),
          priceChange24h: price?.usd_24h_change ?? 0,
          isLoading: false,
          isStale: cached !== undefined && cached > 0,
          error: "Failed to fetch",
        };
      });

      // Sort by USD value descending
      return balances.sort((a, b) => b.usdValue - a.usdValue);
    },
  });
}

export function useTotalBalance(balances: ChainBalance[] | undefined): number {
  if (!balances) return 0;
  return balances.reduce((sum, b) => sum + b.usdValue, 0);
}
