"use client";

import { useCallback, useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { createPublicClient, http } from "viem";
import {
  ERC20_ABI,
  MORPHO_BLUE_ADDRESS,
  WLD_ADDRESS,
  WLD_MARKET,
  WORLD_CHAIN_ID,
  buildApproveCalldata,
  buildSupplyCalldata,
  buildWithdrawCalldata,
} from "@/lib/morpho";
import type { MorphoBalance } from "./useMorphoPosition";

/**
 * useMorphoActions — write operations against the WLD/WETH market.
 *
 * The exposed primitives match the spec:
 *
 *   • depositToMorpho(amount)    — supply WLD as the loan asset
 *   • withdrawFromMorpho(amount) — withdraw underlying WLD
 *
 * Both run through MiniKit, which is World App's in-app wallet. The
 * deposit flow batches approve + supply into a single MiniKit request
 * so the user signs once; MiniKit executes them atomically. Withdraw
 * needs no allowance (the contract burns the user's own shares), so it
 * is a single tx.
 *
 * The hook returns the latest tx hash and an error message if any —
 * the existing UI's status indicators can read those directly.
 */

const worldChainClient = createPublicClient({
  chain: {
    id: WORLD_CHAIN_ID,
    name: "World Chain",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://worldchain-mainnet.g.alchemy.com/public"] },
    },
  },
  transport: http("https://worldchain-mainnet.g.alchemy.com/public"),
});

export type ActionState = "idle" | "pending" | "success" | "error";

interface MiniKitTxResult {
  finalPayload?: { status?: string; transaction_id?: string; error_code?: string };
  executedWith?: string;
  data?: { status?: string; transaction_id?: string };
  transaction_id?: string;
  userOpHash?: string;
}

function extractTxHash(res: unknown): string {
  const r = res as MiniKitTxResult | null;
  if (!r) return "";
  return (
    r.finalPayload?.transaction_id ??
    r.data?.transaction_id ??
    r.transaction_id ??
    r.userOpHash ??
    ""
  );
}

function isSuccess(res: unknown): boolean {
  const r = res as MiniKitTxResult | null;
  if (!r) return false;
  if (r.executedWith === "minikit" || r.executedWith === "wagmi") return true;
  const status = r.finalPayload?.status ?? r.data?.status;
  return status === "success" || !!extractTxHash(r);
}

function mapError(e: unknown, contracts: string[]): string {
  const code = (e as { code?: string })?.code ?? "";
  if (code === "user_rejected") return "Cancelled.";
  if (code === "invalid_contract") {
    return `One of these contracts isn't permitted in the World Developer Portal: ${contracts.join(", ")}. Add them to Permitted Contracts.`;
  }
  if (code) return `Transaction failed: ${code}`;
  return e instanceof Error ? e.message : "Transaction failed";
}

export function useMorphoActions(address: string | null) {
  const [state, setState] = useState<ActionState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setState("idle");
    setTxHash(null);
    setErrorMessage(null);
  }, []);

  /**
   * Deposit `amount` WLD (in token units, i.e. 1 WLD = 10^18) into the
   * selected Morpho market. Batches an ERC-20 approve and supply() into
   * one MiniKit request. The approval is set to exactly `amount` —
   * we don't grant unbounded allowance, since the same flow runs again
   * cleanly if the user comes back.
   *
   * Internally calls `Morpho.supply(MarketParams, assets, 0, onBehalf,
   * "")`, which mints supplyShares to the user and pulls the WLD via
   * the freshly granted allowance.
   */
  const depositToMorpho = useCallback(
    async (amount: bigint): Promise<string | null> => {
      setState("pending");
      setTxHash(null);
      setErrorMessage(null);

      try {
        if (!address) throw new Error("Wallet not connected");
        if (amount <= 0n) throw new Error("Amount must be greater than zero");
        if (!MiniKit.isInstalled()) {
          throw new Error("Open in World App to send transactions.");
        }

        // Skip the approve leg if there's already enough allowance —
        // saves the user a step and avoids a redundant on-chain write.
        const existing = (await worldChainClient.readContract({
          address: WLD_ADDRESS,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address as `0x${string}`, MORPHO_BLUE_ADDRESS],
        })) as bigint;

        const transactions: { to: `0x${string}`; data: `0x${string}`; value: string }[] = [];

        if (existing < amount) {
          transactions.push({
            to: WLD_ADDRESS,
            data: buildApproveCalldata(MORPHO_BLUE_ADDRESS, amount),
            value: "0x0",
          });
        }

        transactions.push({
          to: MORPHO_BLUE_ADDRESS,
          data: buildSupplyCalldata(WLD_MARKET, amount, 0n, address),
          value: "0x0",
        });

        const res = await MiniKit.sendTransaction({
          chainId: WORLD_CHAIN_ID,
          transactions,
        });

        if (!isSuccess(res)) throw new Error("Transaction was not confirmed");

        const hash = extractTxHash(res);
        setTxHash(hash || null);
        setState("success");
        return hash || null;
      } catch (e) {
        const msg = mapError(e, [WLD_ADDRESS, MORPHO_BLUE_ADDRESS]);
        setErrorMessage(msg);
        setState("error");
        return null;
      }
    },
    [address],
  );

  /**
   * Withdraw `amount` WLD (token units). Calls Morpho.withdraw with
   * `assets = amount, shares = 0` — the contract converts assets→shares
   * internally using up-to-date totals, and burns the user's shares.
   *
   * To withdraw the *entire* position cleanly, callers should pass
   * `withdrawFromMorpho(undefined, allShares)` instead — the contract
   * leaves no dust when shares are specified directly. We expose a
   * second-arg overload for that case.
   */
  const withdrawFromMorpho = useCallback(
    async (amount: bigint, sharesOverride?: bigint): Promise<string | null> => {
      setState("pending");
      setTxHash(null);
      setErrorMessage(null);

      try {
        if (!address) throw new Error("Wallet not connected");

        // Either assets or shares must be > 0, never both.
        const useShares = sharesOverride !== undefined && sharesOverride > 0n;
        if (!useShares && amount <= 0n) {
          throw new Error("Amount must be greater than zero");
        }
        if (!MiniKit.isInstalled()) {
          throw new Error("Open in World App to send transactions.");
        }

        const data = buildWithdrawCalldata(
          WLD_MARKET,
          useShares ? 0n : amount,
          useShares ? sharesOverride! : 0n,
          address,   // onBehalf
          address,   // receiver — send WLD straight back to the user
        );

        const res = await MiniKit.sendTransaction({
          chainId: WORLD_CHAIN_ID,
          transactions: [
            { to: MORPHO_BLUE_ADDRESS, data, value: "0x0" },
          ],
        });

        if (!isSuccess(res)) throw new Error("Transaction was not confirmed");

        const hash = extractTxHash(res);
        setTxHash(hash || null);
        setState("success");
        return hash || null;
      } catch (e) {
        const msg = mapError(e, [MORPHO_BLUE_ADDRESS]);
        setErrorMessage(msg);
        setState("error");
        return null;
      }
    },
    [address],
  );

  return {
    depositToMorpho,
    withdrawFromMorpho,
    state,
    txHash,
    errorMessage,
    reset,
  };
}

/**
 * Minimal "pure" facade that mirrors the spec's function signatures.
 * These are the calldata-and-args you'd hand to any signing flow —
 * useful from non-React contexts (e.g. tests, scripts, backend).
 *
 *   getMorphoBalance(user)        → reads chain, returns MorphoBalance
 *   buildDepositCalls(user, amt)  → array of {to, data, value} ready for MiniKit
 *   buildWithdrawCall(user, amt)  → single {to, data, value}
 */

export async function getMorphoBalance(user: string): Promise<MorphoBalance> {
  // Lazy import to avoid pulling React Query into non-component code paths.
  const { computeMorphoBalance } = await import("./useMorphoPosition");
  const { MORPHO_ABI, IRM_ABI, WLD_MARKET_ID } = await import("@/lib/morpho");

  const [marketRes, positionRes] = await worldChainClient.multicall({
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
        args: [WLD_MARKET_ID, user as `0x${string}`],
      },
    ],
    allowFailure: false,
  });

  const [
    totalSupplyAssets,
    totalSupplyShares,
    totalBorrowAssets,
    totalBorrowShares,
    lastUpdate,
    fee,
  ] = marketRes as unknown as readonly bigint[];

  const [supplyShares, borrowShares, collateral] =
    positionRes as unknown as readonly bigint[];

  const market = {
    totalSupplyAssets,
    totalSupplyShares,
    totalBorrowAssets,
    totalBorrowShares,
    lastUpdate,
    fee,
  };

  let borrowRate = 0n;
  try {
    borrowRate = (await worldChainClient.readContract({
      address: WLD_MARKET.irm,
      abi: IRM_ABI,
      functionName: "borrowRateView",
      args: [WLD_MARKET, market],
    })) as bigint;
  } catch {
    /* leave at 0 — display will be slightly stale */
  }

  return computeMorphoBalance(
    market,
    { supplyShares, borrowShares, collateral },
    borrowRate,
    Math.floor(Date.now() / 1000),
  );
}

export function buildDepositCalls(user: string, amount: bigint) {
  return [
    {
      to: WLD_ADDRESS,
      data: buildApproveCalldata(MORPHO_BLUE_ADDRESS, amount),
      value: "0x0",
    },
    {
      to: MORPHO_BLUE_ADDRESS,
      data: buildSupplyCalldata(WLD_MARKET, amount, 0n, user),
      value: "0x0",
    },
  ];
}

export function buildWithdrawCall(user: string, amount: bigint) {
  return {
    to: MORPHO_BLUE_ADDRESS,
    data: buildWithdrawCalldata(WLD_MARKET, amount, 0n, user, user),
    value: "0x0",
  };
}
