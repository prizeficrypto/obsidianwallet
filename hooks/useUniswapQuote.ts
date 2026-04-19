"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getBestQuote,
  applySlippage,
  feeLabel,
  type UniswapQuote,
} from "@/lib/uniswap";
import { parseAmount, formatAmount } from "@/lib/lifi";

export interface UniswapQuoteResult {
  raw: UniswapQuote;
  amountOut: bigint;
  amountOutMinimum: bigint;
  amountOutFormatted: string;
  amountOutMinFormatted: string;
  fee: number;
  feeLabel: string;
}

export interface UniswapQuoteParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string; // human-readable
  decimalsIn: number;
  decimalsOut: number;
  fromAddress: string | null;
  /** Set false to skip the Uniswap quote (e.g. when routing via Universal Protocol) */
  enabled?: boolean;
}

export function useUniswapQuote(params: UniswapQuoteParams) {
  const amountInWei =
    params.amountIn && Number(params.amountIn) > 0
      ? parseAmount(params.amountIn, params.decimalsIn)
      : 0n;

  return useQuery<UniswapQuoteResult | null>({
    queryKey: [
      "uniswap-quote",
      params.tokenIn,
      params.tokenOut,
      amountInWei.toString(),
    ],
    enabled:
      (params.enabled !== false) &&
      !!params.fromAddress &&
      amountInWei > 0n &&
      params.tokenIn.toLowerCase() !== params.tokenOut.toLowerCase(),
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
    queryFn: async () => {
      const quote = await getBestQuote(params.tokenIn, params.tokenOut, amountInWei);
      if (!quote) return null;

      const amountOutMinimum = applySlippage(quote.amountOut);
      return {
        raw: quote,
        amountOut: quote.amountOut,
        amountOutMinimum,
        amountOutFormatted: formatAmount(quote.amountOut.toString(), params.decimalsOut),
        amountOutMinFormatted: formatAmount(amountOutMinimum.toString(), params.decimalsOut),
        fee: quote.fee,
        feeLabel: feeLabel(quote.fee),
      };
    },
  });
}
