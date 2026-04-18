import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Watchlist — tokens the user wants to track, whether or not they hold them.
 *
 * Stored as a flat list of token identities with enough metadata to render
 * a price row (symbol, name, icon). Prices are fetched separately.
 */

export interface WatchToken {
  /** CoinGecko ID — used as the stable key and for price lookups */
  id: string;
  symbol: string;
  name: string;
  /** For ERC-20s — remote image URL */
  logoURI?: string;
  /** For native/chain tokens — ChainIcon identifier */
  chainIconId?: string;
}

interface WatchlistState {
  tokens: WatchToken[];
  add: (token: WatchToken) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      tokens: [],

      add: (token) =>
        set((state) => ({
          tokens: state.tokens.some((t) => t.id === token.id)
            ? state.tokens
            : [...state.tokens, token],
        })),

      remove: (id) =>
        set((state) => ({
          tokens: state.tokens.filter((t) => t.id !== id),
        })),

      has: (id) => get().tokens.some((t) => t.id === id),
    }),
    { name: "world-wallet-watchlist" },
  ),
);
