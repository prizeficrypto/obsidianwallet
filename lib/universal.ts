/**
 * Universal Protocol integration helpers.
 *
 * Swap flow:
 *   1. fetchUPQuote()            → Quote from UP relayer API
 *   2. generateTypedData(quote)  → EIP-712 typed data (via universal-sdk, client-side)
 *   3. MiniKit.signTypedData()   → user signs (no gas cost)
 *   4. submitUPOrder()           → relayer settles on-chain (relayer pays gas)
 *
 * USDC.e is the only supported pair token on World Chain.
 */

export const USDC_E_ADDRESS = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1";

// Contract address (lowercase) → UP API symbol (no "u" prefix).
// Only uXRP remains — it has a confirmed Uniswap V3 pool (1% fee tier) so it
// routes via Uniswap first and only falls back to UP if needed.
// All other UP tokens (uSOL, uDOGE, uADA, uLINK, uXLM, uSUI, uBNB, uLTC,
// uAVAX, uHBAR, uAAVE, uPEPE, uONDO, uPUMP) have been removed from the token
// list since they have no Uniswap/0x liquidity and the UP API requires a key.
const UP_MAP: Record<string, string> = {
  "0x2615a94df961278dcbc41fb0a54fec5f10a693ae": "XRP",
};

/** Returns the UP API token symbol for a contract address, or null if not UP-routable. */
export function getUPSymbol(address: string): string | null {
  return UP_MAP[address.toLowerCase()] ?? null;
}

/** True if this address can be swapped via Universal Protocol. */
export function isUPToken(address: string): boolean {
  return address.toLowerCase() in UP_MAP;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UPQuote {
  type: "BUY" | "SELL";
  token: string;
  token_amount: string;
  pair_token: string;
  pair_token_amount: string;
  slippage_bips: number;
  blockchain: string;
  deadline: string;
  id: string;
  user_address: string;
  merchant_address: string;
  gas_fee_nominal: string;
  gas_fee_dollars: number;
  relayer_nonce: number;
  merchant_id: string;
  mode: "DIRECT" | "BRIDGED";
}

export interface UPQuoteRequest {
  type: "BUY" | "SELL";
  token: string;
  pair_token: "USDC";
  blockchain: "WORLD";
  slippage_bips: number;
  user_address: string;
  pair_token_amount?: string;  // BUY: USDC.e in 6-decimal units
  token_amount?: string;       // SELL: u-token in 18-decimal units
}

// ── API calls (server-side proxy) ────────────────────────────────────────────

export async function fetchUPQuote(req: UPQuoteRequest): Promise<UPQuote> {
  const res = await fetch("/api/universal/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err?.error ?? err?.message) || `Quote failed (${res.status})`);
  }
  return res.json();
}

export async function submitUPOrder(
  quote: UPQuote,
  signature: string
): Promise<{ transaction_hash: string }> {
  const res = await fetch("/api/universal/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...quote, signature }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err?.error ?? err?.message) || `Order failed (${res.status})`);
  }
  return res.json();
}
