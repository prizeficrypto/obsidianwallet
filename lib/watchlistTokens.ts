import type { WatchToken } from "@/store/watchlistStore";
import { SEARCH_TOKENS } from "@/lib/searchTokens";

/**
 * Watchlist token picker — mirrors the actual swappable tokens on World Chain.
 * Only tokens with a CoinGecko ID are included so prices can be fetched.
 */
export const CURATED_WATCH_TOKENS: WatchToken[] = SEARCH_TOKENS
  .filter((t) => !!t.coingeckoId)
  .map((t) => ({
    id: t.coingeckoId!,
    symbol: t.symbol,
    name: t.name,
    logoURI: t.logoURI || undefined,
  }));
