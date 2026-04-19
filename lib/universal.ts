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

// Contract address (lowercase) → UP API symbol (the name UP uses, without the "u" prefix).
// Addresses are the same as in tokens.ts, confirmed against universal-sdk/dist/config.js.
const UP_MAP: Record<string, string> = {
  // Uniswap V3 liquid tokens
  "0x2615a94df961278dcbc41fb0a54fec5f10a693ae": "XRP",
  "0x9b8df6e244526ab5f6e6400d331db28c8fdddb55": "SOL",
  "0x12e96c2bfea6e835cf8dd38a5834fa61cf723736": "DOGE",
  "0xa3a34a0d9a08ccddb6ed422ac0a28a06731335aa": "ADA",
  "0xd403d1624daef243fbcbd4a80d8a6f36affe32b2": "LINK",
  "0x378c326a472915d38b2d8d41e1345987835fab64": "XLM",
  "0xb0505e5a99abd03d94a1169e638b78edfed26ea4": "SUI",
  // V4 / thin liquidity (also UP-routable)
  "0xfdca15bd55f350a36e63c47661914d80411d2c22": "TAO",
  "0xfb3cb973b2a9e2e09746393c59e7fb0d5189d290": "UNI",
  "0xf56ce53561a9cc084e094952232bbfe1e5fb599e": "BONK",
  // Display-only tokens that UP can still trade
  "0x91b1b343ac321c0579ed33854e20a98ef881cc89": "BNB",
  "0x3eb097375fc2fc361e4a472f5e7067238c547c52": "LTC",
  "0xd6a34b430c05ac78c24985f8abee2616bc1788cb": "AVAX",
  "0xc79e06860aa9564f95e08fb7e5b61458d0c63898": "HBAR",
  "0x239b9c1f24f3423062b0d364796e07ee905e9fce": "SHIB",
  "0xf653e8b6fcbd2a63246c6b7722d1e9d819611241": "CRO",
  "0x0f813f4785b2360009f9ac9bf6121a85f109efc6": "DOT",
  "0x5ed25e305e08f58afd7995eac72563e6be65a617": "NEAR",
  "0xf383074c4b993d1ccd196188d27d0ddf22ad463c": "AAVE",
  "0xe5c436b0a34df18f1dae98af344ca5122e7d57c4": "PEPE",
  "0x40318ee213227894b5316e5ec84f6a5caf3bbedd": "ICP",
  "0x90131d95a9a5b48b6a3ee0400807248becf4b7a4": "ONDO",
  "0x3a51f2a377ea8b55faf3c671138a00503b031af3": "ALGO",
  "0xa260ba5fd9ff3fae55ac4930165a9c33519de694": "RNDR",
  "0x893adcbdc7fcfa0ebb6d3803f01df1ec199bf7c5": "QNT",
  "0x6e934283dae5d5d1831cbe8d557c44c9b83f30ee": "ATOM",
  "0x9c0e042d65a2e1ff31ac83f404e5cb79f452c337": "APT",
  "0xdf5913632251585a55970134fad8a774628e9388": "FIL",
  "0xd01cb4171a985571deff48c9dc2f6e153a244d64": "ARB",
  "0xed1a31bb946f0b86cf9d34a1c90546ca75b091b0": "FLR",
  "0x8ccf84de79df699a373421c769f1900aa71200b0": "TRUMP",
  "0xdef3369cb0b783a5f8ee93aaf9674dde53c3ce2a": "PENGU",
  "0x8c655ca4fe20c089d7d6823afd17ed6a377296e3": "MON",
  "0x71a67215a2025f501f386a49858a9ced2fc0249d": "SEI",
  "0xdb18fb11db1b972a54bd89ce04bad61855c07788": "INJ",
  "0x2198b777d5cb8cd5aa01d5c4d70f8f28fed9bc05": "OP",
  "0x6a2ed50496495f087cac3ae1aea3d540ad79ef28": "FARTCOIN",
  "0x17f8d5aa7779094c32536fecb177f93b33b3c3e2": "WIF",
  "0xf081701af06a8d4ecf159c9c178b5ca6a78b5548": "IP",
  "0x3c07ef1bd575b5f5b1ffcb868353f5bc501ed482": "1INCH",
  "0x6814e4be03aeb33fe135fe0e85ca6b0a03247519": "PNUT",
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
  token: string;        // UP symbol e.g. "XRP" (no "u" prefix)
  pair_token: "USDC";
  blockchain: "WORLD";
  slippage_bips: number;
  user_address: string;
  pair_token_amount?: string;  // BUY: USDC.e amount in 6-decimal units
  token_amount?: string;       // SELL: u-token amount in 18-decimal units
}

// ── API calls ─────────────────────────────────────────────────────────────────

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
