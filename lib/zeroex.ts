/**
 * 0x Swap API v1 helpers for World Chain (chainId 480).
 * Used as a fallback when Uniswap V3 finds no direct pool.
 *
 * Routing priority: Uniswap V3 → 0x → Universal Protocol
 */

/** Sentinel address 0x uses for native ETH in API params */
export const ZX_NATIVE_ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

/** Our internal native ETH sentinel → 0x API sell/buy token param */
export function toZxToken(address: string): string {
  return address === "0x0000000000000000000000000000000000000000"
    ? ZX_NATIVE_ETH
    : address;
}

export interface ZeroExQuote {
  /** Contract to send the swap call to */
  to: string;
  /** Encoded calldata */
  data: string;
  /** Native ETH value to attach (wei, as string) */
  value: string;
  /** Address to approve for ERC-20 sell tokens */
  allowanceTarget: string;
  /** Expected output amount (raw wei string) */
  buyAmount: string;
  /** Input amount consumed (raw wei string) */
  sellAmount: string;
  /** Output token address (may be ZX_NATIVE_ETH for ETH) */
  buyTokenAddress: string;
  /** Input token address */
  sellTokenAddress: string;
  estimatedGas: string;
}

export interface ZeroExErrorResponse {
  reason?: string;
  validationErrors?: Array<{ reason: string; field: string }>;
  code?: number;
}

/**
 * Fetch a swap quote from 0x via our server-side proxy.
 * Throws on failure so callers can fall through to the next route.
 */
export async function fetch0xQuote(params: {
  sellToken: string;   // address or ZX_NATIVE_ETH
  buyToken: string;    // address or ZX_NATIVE_ETH
  sellAmount: string;  // raw wei
  takerAddress: string;
  slippagePercentage?: number; // default 0.005 (0.5%)
}): Promise<ZeroExQuote> {
  const search = new URLSearchParams({
    sellToken: params.sellToken,
    buyToken: params.buyToken,
    sellAmount: params.sellAmount,
    takerAddress: params.takerAddress,
    slippagePercentage: (params.slippagePercentage ?? 0.005).toString(),
  });

  const res = await fetch(`/api/0x/quote?${search.toString()}`);
  const data = await res.json() as ZeroExQuote & ZeroExErrorResponse;

  if (!res.ok) {
    const msg =
      data?.validationErrors?.[0]?.reason ??
      data?.reason ??
      `0x quote failed (${res.status})`;
    throw new Error(msg);
  }

  if (!data.to || !data.data) {
    throw new Error("0x returned an incomplete quote");
  }

  return data as ZeroExQuote;
}
