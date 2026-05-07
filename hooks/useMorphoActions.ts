"use client";

import { useCallback, useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { createPublicClient, http } from "viem";
import {
  ERC20_ABI,
  MORPHO_VAULT_ADDRESS,
  WLD_ADDRESS,
  WORLD_CHAIN_ID,
  buildApproveCalldata,
  buildVaultDepositCalldata,
  buildVaultRedeemCalldata,
  buildVaultWithdrawCalldata,
} from "@/lib/morpho";

/**
 * useMorphoActions — write operations against the Re7 WLD vault.
 *
 *   • depositToMorpho(amount)    — approve + vault.deposit(amount, user)
 *   • withdrawFromMorpho(amount, sharesOverride?) — vault.withdraw or .redeem
 *
 * The deposit flow batches approve + deposit into one MiniKit request
 * so the user signs once. Withdraw needs no allowance (the vault burns
 * the user's own shares) so it's a single tx.
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
    return `Add these to Permitted Contracts in the World Developer Portal: ${contracts.join(", ")}`;
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
   * Deposit `amount` WLD (token units, 1 WLD = 10^18) into the Re7 WLD
   * vault. Skips the approve leg if the existing allowance already
   * covers the deposit, saving the user a step.
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

        const existing = (await worldChainClient.readContract({
          address: WLD_ADDRESS,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address as `0x${string}`, MORPHO_VAULT_ADDRESS],
        })) as bigint;

        const transactions: { to: `0x${string}`; data: `0x${string}`; value: string }[] = [];

        if (existing < amount) {
          transactions.push({
            to: WLD_ADDRESS,
            data: buildApproveCalldata(MORPHO_VAULT_ADDRESS, amount),
            value: "0x0",
          });
        }

        transactions.push({
          to: MORPHO_VAULT_ADDRESS,
          data: buildVaultDepositCalldata(amount, address),
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
        const msg = mapError(e, [WLD_ADDRESS, MORPHO_VAULT_ADDRESS]);
        setErrorMessage(msg);
        setState("error");
        return null;
      }
    },
    [address],
  );

  /**
   * Withdraw `amount` WLD (token units). For full-position exits, pass
   * `sharesOverride = position.shares` — that calls vault.redeem() so
   * no dust shares are left from rounding.
   */
  const withdrawFromMorpho = useCallback(
    async (amount: bigint, sharesOverride?: bigint): Promise<string | null> => {
      setState("pending");
      setTxHash(null);
      setErrorMessage(null);

      try {
        if (!address) throw new Error("Wallet not connected");

        const useShares = sharesOverride !== undefined && sharesOverride > 0n;
        if (!useShares && amount <= 0n) {
          throw new Error("Amount must be greater than zero");
        }
        if (!MiniKit.isInstalled()) {
          throw new Error("Open in World App to send transactions.");
        }

        const data = useShares
          ? buildVaultRedeemCalldata(sharesOverride!, address, address)
          : buildVaultWithdrawCalldata(amount, address, address);

        const res = await MiniKit.sendTransaction({
          chainId: WORLD_CHAIN_ID,
          transactions: [
            { to: MORPHO_VAULT_ADDRESS, data, value: "0x0" },
          ],
        });

        if (!isSuccess(res)) throw new Error("Transaction was not confirmed");

        const hash = extractTxHash(res);
        setTxHash(hash || null);
        setState("success");
        return hash || null;
      } catch (e) {
        const msg = mapError(e, [MORPHO_VAULT_ADDRESS]);
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

// ── Standalone facades — useful outside React ───────────────────────

export function buildDepositCalls(user: string, amount: bigint) {
  return [
    {
      to: WLD_ADDRESS,
      data: buildApproveCalldata(MORPHO_VAULT_ADDRESS, amount),
      value: "0x0",
    },
    {
      to: MORPHO_VAULT_ADDRESS,
      data: buildVaultDepositCalldata(amount, user),
      value: "0x0",
    },
  ];
}

export function buildWithdrawCall(user: string, amount: bigint) {
  return {
    to: MORPHO_VAULT_ADDRESS,
    data: buildVaultWithdrawCalldata(amount, user, user),
    value: "0x0",
  };
}
