/**
 * Search token list — all supported tokens on World Chain with CoinGecko IDs for price lookups.
 */

import { WORLD_CHAIN_TOKENS } from "@/lib/tokens";

export interface SearchToken {
  id: string;
  coingeckoId: string | null;
  symbol: string;
  name: string;
  logoURI: string;
  contractAddress: string;
  decimals: number;
}

const COINGECKO_ID: Record<string, string> = {
  "WLD":    "worldcoin-wld",
  "USDC.e": "usd-coin",
  "WETH":   "ethereum",
  "WBTC":   "wrapped-bitcoin",
  "oXAUt":  "tether-gold",
  "uXRP":   "ripple",
  "uSOL":   "solana",
  "uDOGE":  "dogecoin",
  "uADA":   "cardano",
  "uLINK":  "chainlink",
  "uXLM":   "stellar",
  "uSUI":   "sui",
  "uBNB":   "binancecoin",
  "uLTC":   "litecoin",
  "uAVAX":  "avalanche-2",
  "uHBAR":  "hedera-hashgraph",
  "uAAVE":  "aave",
  "uPEPE":  "pepe",
  "uONDO":  "ondo-finance",
  "uPUMP":  "pump-fun",
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

export const ALL_TOKENS = SEARCH_TOKENS;

export const SEARCH_TOKEN_CG_IDS: string[] = [
  ...new Set(SEARCH_TOKENS.flatMap((t) => (t.coingeckoId ? [t.coingeckoId] : []))),
];

export const ALL_TOKEN_CG_IDS = SEARCH_TOKEN_CG_IDS;
