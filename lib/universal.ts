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
const UP_MAP: Record<string, string> = {
  "0x2615a94df961278dcbc41fb0a54fec5f10a693ae": "XRP",
  "0x9b8df6e244526ab5f6e6400d331db28c8fdddb55": "SOL",
  "0x12e96c2bfea6e835cf8dd38a5834fa61cf723736": "DOGE",
  "0xa3a34a0d9a08ccddb6ed422ac0a28a06731335aa": "ADA",
  "0xd403d1624daef243fbcbd4a80d8a6f36affe32b2": "LINK",
  "0x378c326a472915d38b2d8d41e1345987835fab64": "XLM",
  "0xb0505e5a99abd03d94a1169e638b78edfed26ea4": "SUI",
  "0x91b1b343ac321c0579ed33854e20a98ef881cc89": "BNB",
  "0x3eb097375fc2fc361e4a472f5e7067238c547c52": "LTC",
  "0xd6a34b430c05ac78c24985f8abee2616bc1788cb": "AVAX",
  "0xc79e06860aa9564f95e08fb7e5b61458d0c63898": "HBAR",
  "0xf383074c4b993d1ccd196188d27d0ddf22ad463c": "AAVE",
  "0xe5c436b0a34df18f1dae98af344ca5122e7d57c4": "PEPE",
  "0x90131d95a9a5b48b6a3ee0400807248becf4b7a4": "ONDO",
  "0x20fbd133897ef802e0235db77bb19a071e257d41": "PUMP",
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

// ── API calls (called client-side to bypass Vercel bot-detection on server) ──

const UP_API = "https://www.universal.xyz/api/v1";

export async function fetchUPQuote(req: UPQuoteRequest): Promise<UPQuote> {
  const res = await fetch(`${UP_API}/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
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
  const res = await fetch(`${UP_API}/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ...quote, signature }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err?.error ?? err?.message) || `Order failed (${res.status})`);
  }
  return res.json();
}
