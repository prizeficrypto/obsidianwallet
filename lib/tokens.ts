/**
 * Curated token list for World Chain (chainId 480).
 * Includes only tokens with confirmed Uniswap V3 or 0x liquidity.
 * UP-protocol-only tokens (uSOL, uDOGE, etc.) are excluded until the UP API
 * becomes accessible without bot-detection issues.
 */

export interface CuratedToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoURI: string;
}

export const WORLD_CHAIN_TOKENS: CuratedToken[] = [
  // ── World Chain native assets ─────────────────────────────────────────────
  {
    address: "0x2cFc85d8E48F8EAB294be644d9E25C3030863003",
    symbol: "WLD",
    name: "Worldcoin",
    decimals: 18,
    chainId: 480,
    logoURI: "https://assets.coingecko.com/coins/images/31069/small/worldcoin.jpeg",
  },

  // ── Stablecoins & core assets ─────────────────────────────────────────────
  {
    address: "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1",
    symbol: "USDC.e",
    name: "Bridged USDC",
    decimals: 6,
    chainId: 480,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
  },
  {
    address: "0x4200000000000000000000000000000000000006",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    chainId: 480,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
  },
  {
    address: "0x03C7054BCB39f7b2e5B2c7AcB37583e32D70Cfa3",
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    decimals: 8,
    chainId: 480,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png",
  },
  {
    address: "0x30974f73A4ac9E606Ed80da928e454977ac486D2",
    symbol: "oXAUt",
    name: "Tether Gold",
    decimals: 6,
    chainId: 480,
    logoURI: "https://assets.coingecko.com/coins/images/10481/small/Tether_Gold.png",
  },

  // ── Universal Protocol tokens (Uniswap V3 pool confirmed) ────────────────
  {
    address: "0x2615a94df961278DcbC41Fb0a54fEc5f10a693aE",
    symbol: "uXRP",
    name: "XRP (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  },
];

// Quick lookup by address (lowercase)
export const TOKEN_MAP: Record<string, CuratedToken> = Object.fromEntries(
  WORLD_CHAIN_TOKENS.map((t) => [t.address.toLowerCase(), t])
);
