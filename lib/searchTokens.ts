/**
 * Search token list — all swappable tokens on World Chain with CoinGecko IDs
 * for price lookups. Derived from WORLD_CHAIN_TOKENS + a symbol→ID mapping.
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
}

/** Maps token symbol → CoinGecko ID for price lookups */
const COINGECKO_ID: Record<string, string> = {
  "USDC.e": "usd-coin",
  "WETH":   "ethereum",
  "WBTC":   "wrapped-bitcoin",
  "oXAUt":  "pax-gold",
  "uXRP":   "ripple",
  "uBNB":   "binancecoin",
  "uSOL":   "solana",
  "uDOGE":  "dogecoin",
  "uADA":   "cardano",
  "uLINK":  "chainlink",
  "uXLM":   "stellar",
  "uLTC":   "litecoin",
  "uAVAX":  "avalanche-2",
  "uSUI":   "sui",
  "uHBAR":  "hedera-hashgraph",
  "uSHIB":  "shiba-inu",
  "uCRO":   "crypto-com-chain",
  "uTAO":   "bittensor",
  "uUNI":   "uniswap",
  "uDOT":   "polkadot",
  "uNEAR":  "near",
  "uAAVE":  "aave",
  "uPEPE":  "pepe",
  "uICP":   "internet-computer",
  "uONDO":  "ondo-finance",
  "uALGO":  "algorand",
  "uRNDR":  "render-token",
  "uPOLL":  "pooltogether",
  "uQNT":   "quant-network",
  "uATOM":  "cosmos",
  "uAPT":   "aptos",
  "uFIL":   "filecoin",
  "uARB":   "arbitrum",
  "uFLR":   "flare-networks",
  "uTRUMP": "official-trump",
  "uBONK":  "bonk",
  "uPENGU": "pudgy-penguins",
  "uSEI":   "sei-network",
  "uINJ":   "injective-protocol",
  "uOP":    "optimism",
  "uFARTCOIN": "fartcoin",
  "uWIF":   "dogwifcoin",
  "uIP":    "story-2",
  "u1INCH": "1inch",
  "uPNUT":  "peanut-the-squirrel",
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
  };
});

/** CoinGecko IDs for all tokens that have one — used for batch price fetching */
export const SEARCH_TOKEN_CG_IDS: string[] = [
  ...new Set(SEARCH_TOKENS.flatMap((t) => (t.coingeckoId ? [t.coingeckoId] : []))),
];
