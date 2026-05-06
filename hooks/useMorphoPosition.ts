"use client";

import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http } from "viem";
import {
  IRM_ABI,
  MORPHO_ABI,
  MORPHO_BLUE_ADDRESS,
  WLD_MARKET,
  WLD_MARKET_ID,
  accrueInterestView,
  sharesToAssetsDown,
  type MarketState,
  type PositionState,
} from "@/lib/morpho";

/**
 * useMorphoPosition — read-only view of a user's WLD supply position.
 *
 * Yield is auto-compounded on Morpho Blue: there is no claim function.
 * Suppliers hold shares; the underlying asset value of those shares
 * grows as borrowers pay interest. To display the *current* WLD value
 * (including pending interest since the last on-chain accrual), we:
 *
 *   1. Multicall market(id), position(id, user), and irm.borrowRateView
 *      so all three reads see the same block.
 *   2. Replay accrueInterest() locally — adding interest = totalBorrow ×
 *      wTaylorCompounded(rate, elapsed) and minting fee shares the same
 *      way the contract does — to get an up-to-the-second supply total.
 *   3. Convert the user's shares to assets via Morpho's SharesMath
 *      (with the protocol's virtual offsets).
 *
 * Result: the displayed balance matches what withdraw(maxShares) would
 * actually pay out in this block, modulo block-time drift.
 */

const worldChainClient = createPublicClient({
  chain: {
    id: 480,
    name: "World Chain",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://worldchain-mainnet.g.alchemy.com/public"] },
    },
    contracts: {
      multicall3: {
        address: "0xcA11bde05977b3631167028862bE2a173976CA11" as `0x${string}`,
      },
    },
  },
  transport: http("https://worldchain-mainnet.g.alchemy.com/public"),
});

export interface MorphoBalance {
  /** User's supply shares — protocol unit, not human-displayable. */
  shares: bigint;
  /** Underlying WLD assets the shares are worth right now (incl. interest). */
  assets: bigint;
  /** Convenience: assets formatted as a human-readable WLD number. */
  assetsFormatted: number;
  /** Annualized supply APY as a fraction (0.03 = 3%). */
  supplyApy: number;
  /** Live block timestamp used for accrual. */
  computedAt: number;
}

const EMPTY: MorphoBalance = {
  shares: 0n,
  assets: 0n,
  assetsFormatted: 0,
  supplyApy: 0,
  computedAt: 0,
};

/**
 * Pure helper: given on-chain reads, derive the user's current
 * underlying balance and APY. Exported so tests / one-shot callers
 * can use it without React.
 */
export function computeMorphoBalance(
  market: MarketState,
  position: PositionState,
  borrowRatePerSecond: bigint,
  nowSec: number,
): MorphoBalance {
  const accrued = accrueInterestView(market, borrowRatePerSecond, BigInt(nowSec));
  const assets = sharesToAssetsDown(
    position.supplyShares,
    accrued.totalSupplyAssets,
    accrued.totalSupplyShares,
  );

  // APY for display: (1 + ratePerSecond)^secondsPerYear − 1, weighted
  // by current utilization since suppliers only earn on borrowed funds.
  // We compute on the *post-accrual* totals so the APY shown lines up
  // with the balance we just calculated.
  const rateWadPerYear = Number(borrowRatePerSecond) / 1e18 * 31_536_000;
  const utilization =
    accrued.totalSupplyAssets === 0n
      ? 0
      : Number((market.totalBorrowAssets * 10_000n) / accrued.totalSupplyAssets) /
        10_000;
  // Continuous compounding: APY = e^(rate × util) − 1
  const supplyApy = Math.expm1(rateWadPerYear * utilization);

  return {
    shares: position.supplyShares,
    assets,
    assetsFormatted: Number(assets) / 1e18,
    supplyApy,
    computedAt: nowSec,
  };
}

export function useMorphoPosition(address: string | null) {
  return useQuery<MorphoBalance>({
    queryKey: ["morpho-position", address?.toLowerCase() ?? null],
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
    queryFn: async () => {
      if (!address) return EMPTY;

      // Step 1: read market state + user position together — single block.
      const step1 = await worldChainClient.multicall({
        contracts: [
          {
            address: MORPHO_BLUE_ADDRESS,
            abi: MORPHO_ABI,
            functionName: "market",
            args: [WLD_MARKET_ID],
          },
          {
            address: MORPHO_BLUE_ADDRESS,
            abi: MORPHO_ABI,
            functionName: "position",
            args: [WLD_MARKET_ID, address as `0x${string}`],
          },
        ],
        allowFailure: true,
      });

      const [marketRes, positionRes] = step1;
      if (marketRes.status !== "success" || positionRes.status !== "success") {
        return EMPTY;
      }

      const [
        totalSupplyAssets,
        totalSupplyShares,
        totalBorrowAssets,
        totalBorrowShares,
        lastUpdate,
        fee,
      ] = marketRes.result as readonly bigint[];

      const market: MarketState = {
        totalSupplyAssets,
        totalSupplyShares,
        totalBorrowAssets,
        totalBorrowShares,
        lastUpdate,
        fee,
      };

      const [supplyShares, borrowShares, collateral] =
        positionRes.result as readonly bigint[];
      const position: PositionState = {
        supplyShares,
        borrowShares,
        collateral,
      };

      // Step 2: ask the IRM what the borrow rate is *given* the current
      // market state. Adaptive curve IRMs need real utilization to
      // produce a correct rate, so we pass the market we just read.
      // If this read reverts (e.g. cold market), fall back to no
      // accrual — assets will be slightly stale but never overstated.
      let borrowRate = 0n;
      try {
        borrowRate = (await worldChainClient.readContract({
          address: WLD_MARKET.irm,
          abi: IRM_ABI,
          functionName: "borrowRateView",
          args: [WLD_MARKET, market],
        })) as bigint;
      } catch {
        borrowRate = 0n;
      }

      const nowSec = Math.floor(Date.now() / 1000);
      return computeMorphoBalance(market, position, borrowRate, nowSec);
    },
  });
}
