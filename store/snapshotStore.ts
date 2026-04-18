import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Snapshot store — persists the user's portfolio state between visits.
 *
 * On each app open we compare the current portfolio to the last snapshot
 * to power "since you left" and "movers" features.
 *
 * Only stores the minimum data needed:
 *  - total portfolio value
 *  - per-asset prices
 *  - timestamp
 */

export interface AssetSnapshot {
  /** coingecko-style id or chain id */
  id: string;
  symbol: string;
  priceUSD: number;
  balanceUSD: number;
}

export interface PortfolioSnapshot {
  totalUSD: number;
  assets: AssetSnapshot[];
  timestamp: number;
}

interface SnapshotState {
  /** The snapshot from the user's previous session */
  lastSnapshot: PortfolioSnapshot | null;
  /** When the current session started (set once per mount) */
  sessionStartedAt: number | null;
  /** Whether the "since you left" banner has been dismissed this session */
  bannerDismissed: boolean;

  saveSnapshot: (snapshot: PortfolioSnapshot) => void;
  startSession: () => void;
  dismissBanner: () => void;
}

export const useSnapshotStore = create<SnapshotState>()(
  persist(
    (set) => ({
      lastSnapshot: null,
      sessionStartedAt: null,
      bannerDismissed: false,

      saveSnapshot: (snapshot) =>
        set({ lastSnapshot: snapshot }),

      startSession: () =>
        set((state) => {
          // Only set once per app lifecycle
          if (state.sessionStartedAt) return state;
          return { sessionStartedAt: Date.now(), bannerDismissed: false };
        }),

      dismissBanner: () =>
        set({ bannerDismissed: true }),
    }),
    {
      name: "world-wallet-snapshot",
      // Don't persist session-scoped fields
      partialize: (state) => ({
        lastSnapshot: state.lastSnapshot,
      }),
    }
  )
);
