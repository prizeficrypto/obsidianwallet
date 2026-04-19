"use client";

import { useEffect, useMemo, useRef } from "react";
import { useSnapshotStore, type AssetSnapshot, type PortfolioSnapshot } from "@/store/snapshotStore";
import { computeSinceYouLeft, computeMovers, type SinceYouLeftData, type Mover } from "@/lib/returnValue";
import type { ChainBalance } from "@/hooks/useChainBalances";
import type { WldBalance } from "@/hooks/useWldBalance";

interface UseReturnValueArgs {
  totalUSD: number;
  balances: ChainBalance[] | undefined;
  wldBalance: WldBalance | undefined;
  wldPriceUSD: number;
  isLoading: boolean;
}

interface ReturnValueResult {
  sinceYouLeft: SinceYouLeftData | null;
  movers: Mover[];
  dismissBanner: () => void;
  bannerDismissed: boolean;
}

/**
 * Manages the full return-value lifecycle:
 * 1. On first render — starts session, reads last snapshot
 * 2. While data loads — computes "since you left" and movers
 * 3. On stable data — saves a new snapshot for next session
 *
 * The snapshot is saved after a delay to avoid capturing
 * intermediate/loading states.
 */
export function useReturnValue({
  totalUSD,
  balances,
  wldBalance,
  wldPriceUSD,
  isLoading,
}: UseReturnValueArgs): ReturnValueResult {
  const { lastSnapshot, bannerDismissed, startSession, saveSnapshot, dismissBanner } =
    useSnapshotStore();

  const savedRef = useRef(false);
  const currentAssetsRef = useRef<AssetSnapshot[]>([]);

  // Start session on mount (only runs once)
  useEffect(() => {
    startSession();
  }, [startSession]);

  // Build current asset list for comparison + snapshotting
  const currentAssets: AssetSnapshot[] = useMemo(() => {
    const assets: AssetSnapshot[] = [];

    if (wldBalance && wldBalance.usd > 0.01) {
      const amt = parseFloat(wldBalance.formatted);
      assets.push({
        id: "worldcoin-wld",
        symbol: "WLD",
        priceUSD: amt > 0 ? wldBalance.usd / amt : wldPriceUSD,
        balanceUSD: wldBalance.usd,
      });
    }

    for (const b of balances ?? []) {
      if (b.usdValue > 0.01) {
        const price =
          b.nativeBalance > 0 ? b.usdValue / b.nativeBalance : 0;
        assets.push({
          id: b.chain.id, // Use chain ID as unique key (not coingeckoId which may collide)
          symbol: b.chain.symbol,
          priceUSD: price,
          balanceUSD: b.usdValue,
        });
      }
    }

    return assets;
  }, [balances, wldBalance, wldPriceUSD]);

  // Compute return-value data
  const sinceYouLeft = useMemo(
    () => computeSinceYouLeft(lastSnapshot, totalUSD, currentAssets),
    [lastSnapshot, totalUSD, currentAssets],
  );

  const movers = useMemo(
    () => computeMovers(lastSnapshot, currentAssets),
    [lastSnapshot, currentAssets],
  );

  // Keep ref in sync so the timeout closure always has the latest
  currentAssetsRef.current = currentAssets;

  // Stable key so we can track when assets meaningfully change
  // without putting the array itself in the deps (which can cause
  // React to warn about changing dep-array size).
  const assetsKey = currentAssets.length > 0
    ? currentAssets.map(a => `${a.id}:${a.balanceUSD.toFixed(2)}`).join("|")
    : "";

  // Save new snapshot for the NEXT session.
  // We wait 2 minutes so the user sees "since you left" data first,
  // then quietly update the baseline for their next visit.
  useEffect(() => {
    if (isLoading || totalUSD < 0.01 || !assetsKey) return;
    if (savedRef.current) return;

    const SAVE_DELAY = 2 * 60 * 1000; // 2 minutes

    const timer = setTimeout(() => {
      if (savedRef.current) return;
      savedRef.current = true;

      const snapshot: PortfolioSnapshot = {
        totalUSD,
        assets: currentAssetsRef.current,
        timestamp: Date.now(),
      };
      saveSnapshot(snapshot);
    }, SAVE_DELAY);

    return () => clearTimeout(timer);
  }, [isLoading, totalUSD, assetsKey, saveSnapshot]);

  return { sinceYouLeft, movers, dismissBanner, bannerDismissed };
}
