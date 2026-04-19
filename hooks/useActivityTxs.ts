"use client";

import { useQuery } from "@tanstack/react-query";
import type { Transaction, TxType } from "@/types/transaction";

// ── Types ──────────────────────────────────────────────────────────────────────

interface RawTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  gasUsed: string;
  gasPrice: string;
}

interface RawTokenTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  tokenSymbol: string;
  tokenName: string;
  tokenDecimal: string;
  contractAddress: string;
  isError?: string;
}

// Known swap routers on World Chain — any transfer to/from these is a swap leg.
const SWAP_ROUTERS = new Set([
  "0x091ad9e2e6e5ed44c1c66db50e49a601f9f36cf6", // Uniswap V3 SwapRouter
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", // Uniswap V2 Router (fallback)
  "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad", // Universal Router
]);

// ERC-20 function selectors
const SEL_TRANSFER = "0xa9059cbb";  // transfer(address,uint256)
const SEL_APPROVE  = "0x095ea7b3";  // approve(address,uint256)

function isSwapRouter(addr: string): boolean {
  return SWAP_ROUTERS.has(addr.toLowerCase());
}

function classifyTokenTx(tx: RawTokenTx, userAddr: string): TxType {
  const from = tx.from.toLowerCase();
  const to   = tx.to.toLowerCase();
  if (isSwapRouter(from) || isSwapRouter(to)) return "swap";
  if (from === userAddr) return "send";
  return "receive";
}

function classifyNativeTx(tx: RawTx, userAddr: string): TxType {
  const to = tx.to?.toLowerCase() ?? "";
  if (isSwapRouter(to)) return "swap";
  if (tx.from.toLowerCase() === userAddr) return "send";
  return "receive";
}

function fmtTokenAmount(raw: string, decimals: number): string {
  try {
    const n = Number(BigInt(raw)) / 10 ** decimals;
    if (n === 0) return "0";
    if (n < 0.0001) return "<0.0001";
    if (n < 1) return n.toFixed(4);
    if (n < 1_000) return n.toFixed(3).replace(/\.?0+$/, "");
    return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  } catch {
    return "?";
  }
}

function fmtEthAmount(weiStr: string): string {
  try {
    const eth = Number(BigInt(weiStr)) / 1e18;
    if (eth === 0) return "0 ETH";
    if (eth < 0.000001) return "<0.000001 ETH";
    if (eth < 0.01) return `${eth.toFixed(6)} ETH`;
    return `${eth.toFixed(4)} ETH`;
  } catch {
    return "? ETH";
  }
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
      const userAddr = address.toLowerCase();

      // ── ERC-20 token transfers ────────────────────────────────────────────
      // Group by hash — a single tx can have multiple token transfer events
      // (e.g. both legs of a swap share the same hash).
      const tokenByHash = new Map<string, RawTokenTx[]>();
      for (const tx of tokenTxs ?? []) {
        if (!tokenByHash.has(tx.hash)) tokenByHash.set(tx.hash, []);
        tokenByHash.get(tx.hash)!.push(tx);
      }

      for (const [hash, transfers] of tokenByHash) {
        if (seenHashes.has(hash)) continue;
        seenHashes.add(hash);

        // Drop if all are errors
        const valid = transfers.filter((t) => t.isError !== "1");
        if (valid.length === 0) continue;

        const ts = parseInt(valid[0].timeStamp, 10) * 1000;

        if (valid.length === 1) {
          // Simple send or receive
          const tx = valid[0];
          const decimals = parseInt(tx.tokenDecimal, 10) || 18;
          const type = classifyTokenTx(tx, userAddr);

          result.push({
            hash,
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
            timestamp: ts,
          });
        } else {
          // Multiple transfers sharing one hash → swap (or complex interaction).
          // Identify the leg going OUT from the user and the leg coming IN to the user.
          const outLeg = valid.find(
            (t) => t.from.toLowerCase() === userAddr || isSwapRouter(t.to.toLowerCase()),
          );
          const inLeg = valid.find(
            (t) => t.to.toLowerCase() === userAddr || isSwapRouter(t.from.toLowerCase()),
          );

          // Prefer legs where user is directly involved; fall back to first/last.
          const spent   = outLeg ?? valid[0];
          const received = inLeg ?? valid[valid.length - 1];

          const spentDec    = parseInt(spent.tokenDecimal, 10) || 18;
          const receivedDec = parseInt(received.tokenDecimal, 10) || 18;

          result.push({
            hash,
            type: "swap",
            status: "success",
            chainId: "world-chain",
            from: spent.from,
            to: received.to,
            value: received.value,
            // valueFormatted = what the user received
            valueFormatted: `${fmtTokenAmount(received.value, receivedDec)} ${received.tokenSymbol}`,
            token: {
              symbol: received.tokenSymbol,
              address: received.contractAddress,
              decimals: receivedDec,
            },
            // tokenIn = what the user spent
            tokenIn: {
              symbol: spent.tokenSymbol,
              address: spent.contractAddress,
              decimals: spentDec,
              valueFormatted: `${fmtTokenAmount(spent.value, spentDec)} ${spent.tokenSymbol}`,
            },
            timestamp: ts,
          });
        }
      }

      // ── Native ETH transfers ──────────────────────────────────────────────
      for (const tx of txs ?? []) {
        if (seenHashes.has(tx.hash)) continue;
        seenHashes.add(tx.hash);

        if (tx.isError === "1" || tx.txreceipt_status === "0") continue;

        const type = classifyNativeTx(tx, userAddr);
        const input = (tx.input ?? "").toLowerCase();

        // Skip pure approvals (approve selector) — not meaningful to show
        if (input.startsWith(SEL_APPROVE)) continue;

        // Skip zero-value contract calls that aren't swaps or token sends.
        // Token sends have the ERC-20 transfer selector (0xa9059cbb).
        const isTokenSend = input.startsWith(SEL_TRANSFER);
        if (tx.value === "0" && input !== "0x" && type !== "swap" && !isTokenSend) continue;

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
