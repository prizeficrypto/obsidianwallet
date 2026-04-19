"use client";

import { useQuery } from "@tanstack/react-query";
import type { Transaction, TxType } from "@/types/transaction";

// ── Types from the Alchemy/Blockscout-compatible explorer API ─────────────────

interface RawTx {
  hash: string;
  from: string;
  to: string;
  value: string;       // wei, as decimal string
  timeStamp: string;   // unix seconds
  isError: string;     // "0" = ok, "1" = reverted
  txreceipt_status: string;
  input: string;
  gasUsed: string;
  gasPrice: string;
}

interface RawTokenTx {
  hash: string;
  from: string;
  to: string;
  value: string;       // token amount (raw, needs dividing by 10^decimals)
  timeStamp: string;
  tokenSymbol: string;
  tokenName: string;
  tokenDecimal: string;
  contractAddress: string;
  isError?: string;
}

// Known swap router on World Chain — used to classify swaps
const SWAP_ROUTER = "0x091ad9e2e6e5ed44c1c66db50e49a601f9f36cf6";

function classifyNativeTx(tx: RawTx, userAddr: string): TxType {
  const from = tx.from.toLowerCase();
  const to = tx.to?.toLowerCase() ?? "";
  const addr = userAddr.toLowerCase();
  if (to === SWAP_ROUTER) return "swap";
  if (from === addr) return "send";
  return "receive";
}

function classifyTokenTx(tx: RawTokenTx, userAddr: string): TxType {
  const from = tx.from.toLowerCase();
  const to = tx.to?.toLowerCase() ?? "";
  const addr = userAddr.toLowerCase();
  if (from === SWAP_ROUTER || to === SWAP_ROUTER) return "swap";
  if (from === addr) return "send";
  return "receive";
}

function fmtTokenAmount(raw: string, decimals: number): string {
  const n = Number(BigInt(raw)) / 10 ** decimals;
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  if (n < 1) return n.toFixed(4);
  if (n < 1_000) return n.toFixed(3).replace(/\.?0+$/, "");
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function fmtEthAmount(weiStr: string): string {
  const eth = Number(BigInt(weiStr)) / 1e18;
  if (eth === 0) return "0";
  if (eth < 0.000001) return "<0.000001 ETH";
  if (eth < 0.01) return `${eth.toFixed(6)} ETH`;
  return `${eth.toFixed(4)} ETH`;
}

export function useActivityTxs(address: string | null) {
  return useQuery<Transaction[]>({
    queryKey: ["activity-txs", address],
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
    queryFn: async () => {
      if (!address) return [];

      const res = await fetch(`/api/activity?address=${encodeURIComponent(address)}`);
      if (!res.ok) return [];

      const { txs, tokenTxs } = (await res.json()) as {
        txs: RawTx[];
        tokenTxs: RawTokenTx[];
      };

      const result: Transaction[] = [];
      const seenHashes = new Set<string>();

      // ── ERC-20 token transfers ────────────────────────────────────────────
      for (const tx of tokenTxs ?? []) {
        if (seenHashes.has(tx.hash)) continue;
        seenHashes.add(tx.hash);
        if (tx.isError === "1") continue;

        const decimals = parseInt(tx.tokenDecimal, 10) || 18;
        const type = classifyTokenTx(tx, address);

        result.push({
          hash: tx.hash,
          type,
          status: "success",
          chainId: "world-chain",
          from: tx.from,
          to: tx.to,
          value: tx.value,
          valueFormatted: `${fmtTokenAmount(tx.value, decimals)} ${tx.tokenSymbol}`,
          token: {
            symbol: tx.tokenSymbol,
            address: tx.contractAddress,
            decimals,
          },
          timestamp: parseInt(tx.timeStamp, 10) * 1000,
        });
      }

      // ── Native ETH transfers ──────────────────────────────────────────────
      for (const tx of txs ?? []) {
        if (seenHashes.has(tx.hash)) continue;
        seenHashes.add(tx.hash);
        if (tx.isError === "1" || tx.txreceipt_status === "0") continue;

        const type = classifyNativeTx(tx, address);
        // Skip pure contract interactions with 0 ETH value (gas-only rows)
        if (tx.value === "0" && tx.input !== "0x" && type !== "swap") continue;

        result.push({
          hash: tx.hash,
          type,
          status: "success",
          chainId: "world-chain",
          from: tx.from,
          to: tx.to ?? "",
          value: tx.value,
          valueFormatted: fmtEthAmount(tx.value),
          timestamp: parseInt(tx.timeStamp, 10) * 1000,
        });
      }

      // Sort newest first
      result.sort((a, b) => b.timestamp - a.timestamp);

      return result;
    },
  });
}
