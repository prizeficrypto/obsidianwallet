import type { Token } from "./token";

export interface SwapQuoteParams {
  fromChainId: string;
  toChainId: string;
  fromToken: Token;
  toToken: Token;
  fromAmount: string;            // human readable
  fromAddress: string;
  slippage?: number;             // 0.03 = 3%
}

export interface SwapQuote {
  id: string;
  provider: string;              // "lifi", "jupiter", etc.
  fromToken: Token;
  toToken: Token;
  fromAmount: string;            // raw bigint string
  toAmount: string;              // raw bigint string
  toAmountMin: string;
  fromAmountFormatted: string;
  toAmountFormatted: string;
  priceImpact?: number;
  executionDuration: number;     // seconds
  feesUSD: number;
  gasUSD: number;
  route?: RouteStep[];
  raw?: unknown;                 // provider-specific raw quote
}

export interface RouteStep {
  type: "swap" | "bridge" | "cross";
  protocol: string;
  fromChainId: string;
  toChainId: string;
  fromToken: Token;
  toToken: Token;
}

export interface SwapTx {
  to: string;
  data: string;
  value: string;
  gasLimit?: string;
  chainId: number;
}
