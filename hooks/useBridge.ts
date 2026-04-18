"use client";

import { fetchLifiQuote, fetchLifiTokens, type LifiQuote, type LifiToken } from "@/lib/lifi";
import { useQuery } from "@tanstack/react-query";

export function useLifiTokens(chainId: number | null) {
  return useQuery<LifiToken[]>({
    queryKey: ["lifi-tokens", chainId],
    enabled: !!chainId,
    staleTime: 5 * 60_000,
    queryFn: () => fetchLifiTokens(chainId!),
  });
}

export interface BridgeQuoteParams {
  fromChain: number | null;
  toChain: number | null;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string | null;
  // Required when destination is a non-EVM chain (e.g. Solana).
  // For EVM→EVM Li.Fi defaults toAddress = fromAddress which is correct.
  toAddress?: string;
}

export function useBridgeQuote(params: BridgeQuoteParams) {
  const isNonEvmDest = !!params.toAddress; // if caller passed toAddress, they know it's needed

  return useQuery<LifiQuote | null>({
    queryKey: ["bridge-quote", params],
    enabled:
      !!params.fromChain &&
      !!params.toChain &&
      !!params.fromAddress &&
      !!params.fromAmount &&
      Number(params.fromAmount) > 0 &&
      // Same-chain swaps (swap mode) are valid — block only same-token same-chain
      params.fromToken !== params.toToken &&
      // When going to a non-EVM chain we need a destination address before quoting
      (!isNonEvmDest || !!params.toAddress),
    staleTime: 30_000,
    // Automatically re-fetch every 30s so the displayed quote stays fresh.
    // This is display-only: we always fetch a fresh quote right before execution.
    refetchInterval: 30_000,
    retry: 1,
    queryFn: () =>
      fetchLifiQuote({
        fromChain: params.fromChain!,
        toChain: params.toChain!,
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.fromAmount,
        fromAddress: params.fromAddress!,
        toAddress: params.toAddress,
      }),
  });
}
