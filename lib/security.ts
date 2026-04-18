/**
 * Security constants and validation utilities for transaction building.
 *
 * These are the authoritative Li.Fi router/diamond contract addresses.
 * Source: https://docs.li.fi/li.fi-api/contract-addresses
 * All addresses are checksummed.
 */

// Li.Fi diamond proxy — the single router address Li.Fi uses on all EVM chains.
// This address is the same across Ethereum, Polygon, BNB Chain, Avalanche, and World Chain.
export const LIFI_ROUTER_ADDRESSES: ReadonlySet<string> = new Set([
  "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE".toLowerCase(),
  // Legacy Li.Fi router (pre-diamond, some older routes still use it):
  "0x341e94069f53234fE6DabeF707aD424830525715".toLowerCase(),
]);

/**
 * Uniswap V3 SwapRouter02 on World Chain.
 * Source: World Chain official docs + Uniswap governance deployments list.
 */
export const UNISWAP_ROUTER_ADDRESSES: ReadonlySet<string> = new Set([
  "0x091AD9e2e6e5eD44c1c66dB50e49A601F9f36cF6".toLowerCase(),
]);

/** All known safe swap routers (Li.Fi + Uniswap). */
export const KNOWN_ROUTERS: ReadonlySet<string> = new Set([
  ...LIFI_ROUTER_ADDRESSES,
  ...UNISWAP_ROUTER_ADDRESSES,
]);

/**
 * Validate that a transaction target is a known swap router.
 * Call this before passing `tx.to` to MiniKit.
 */
export function isKnownRouter(address: string): boolean {
  return KNOWN_ROUTERS.has(address.toLowerCase());
}

/**
 * @deprecated Use isKnownRouter instead (now covers both Li.Fi and Uniswap).
 */
export function isKnownLifiRouter(address: string): boolean {
  return isKnownRouter(address);
}

/**
 * Validate a Solana base58 address.
 * Solana addresses are 32–44 chars of base58 alphabet (excludes 0, O, I, l).
 * This is a format check only — it does not verify the account exists on-chain.
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || address.length < 32 || address.length > 44) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
}

/**
 * Validate an EVM address (checksummed or lowercase).
 * Uses the standard 0x + 40 hex chars format check.
 */
export function isValidEvmAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}
