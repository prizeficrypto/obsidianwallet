/**
 * Search token list — all tokens on World Chain with CoinGecko IDs for price lookups.
 * Derived from WORLD_CHAIN_TOKENS + a symbol→CoinGecko ID mapping.
 *
 * Core tokens (WLD, USDC.e, WETH, WBTC, oXAUt) route via Uniswap V3/V4.
 * Universal Protocol u-tokens route via Universal Protocol's relayer API.
 */

import { WORLD_CHAIN_TOKENS } from "@/lib/tokens";

export interface SearchToken {
  /** Stable identifier — CoinGecko ID when available, else contract address */
  id: string;
  coingeckoId: string | null;
  symbol: string;
  name: string;
  logoURI: string;
  contractAddress: string;
  decimals: number;
}

/** Maps token symbol → CoinGecko ID for price lookups */
const COINGECKO_ID: Record<string, string> = {
  "WLD":       "worldcoin-wld",
  "USDC.e":    "usd-coin",
  "WETH":      "ethereum",
  "WBTC":      "wrapped-bitcoin",
  "oXAUt":     "tether-gold",
  "uXRP":      "ripple",
  "uSOL":      "solana",
  "uDOGE":     "dogecoin",
  "uADA":      "cardano",
  "uLINK":     "chainlink",
  "uXLM":      "stellar",
  "uSUI":      "sui",
  "uTAO":      "bittensor",
  "uUNI":      "uniswap",
  "uBONK":     "bonk",
  "uBNB":      "binancecoin",
  "uLTC":      "litecoin",
  "uAVAX":     "avalanche-2",
  "uHBAR":     "hedera-hashgraph",
  "uSHIB":     "shiba-inu",
  "uCRO":      "crypto-com-chain",
  "uDOT":      "polkadot",
  "uNEAR":     "near",
  "uAAVE":     "aave",
  "uPEPE":     "pepe",
  "uICP":      "internet-computer",
  "uONDO":     "ondo-finance",
  "uALGO":     "algorand",
  "uRNDR":     "render-token",
  "uQNT":      "quant-network",
  "uATOM":     "cosmos",
  "uAPT":      "aptos",
  "uFIL":      "filecoin",
  "uARB":      "arbitrum",
  "uFLR":      "flare-networks",
  "uTRUMP":    "official-trump",
  "uPENGU":    "pudgy-penguins",
  "uSEI":      "sei-network",
  "uINJ":      "injective-protocol",
  "uOP":       "optimism",
  "uFARTCOIN": "fartcoin",
  "uWIF":      "dogwifcoin",
  "uIP":       "story-2",
  "u1INCH":    "1inch",
  "uPNUT":     "peanut-the-squirrel",
};

export const SEARCH_TOKENS: SearchToken[] = WORLD_CHAIN_TOKENS.map((t) => {
  const cgId = COINGECKO_ID[t.symbol] ?? null;
  return {
    id: cgId ?? t.address.toLowerCase(),
    coingeckoId: cgId,
    symbol: t.symbol,
    name: t.name,
    logoURI: t.logoURI,
    contractAddress: t.address,
    decimals: t.decimals,
  };
});

// Alias used by useWorldChainTokenBalances (balance multicall covers all tokens)
export const ALL_TOKENS = SEARCH_TOKENS;

/** CoinGecko IDs for all tokens — used for batch price fetching */
export const SEARCH_TOKEN_CG_IDS: string[] = [
  ...new Set(SEARCH_TOKENS.flatMap((t) => (t.coingeckoId ? [t.coingeckoId] : []))),
];

export const ALL_TOKEN_CG_IDS = SEARCH_TOKEN_CG_IDS;
