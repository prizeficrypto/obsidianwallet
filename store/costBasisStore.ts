import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CostBasisEntry {
  avgCostUSD: number; // average purchase price per 1 token unit, in USD
  updatedAt: number;
}

interface CostBasisState {
  /** keyed by coingeckoId */
  entries: Record<string, CostBasisEntry>;
  setEntry: (coingeckoId: string, avgCostUSD: number) => void;
  removeEntry: (coingeckoId: string) => void;
}

export const useCostBasisStore = create<CostBasisState>()(
  persist(
    (set) => ({
      entries: {},
      setEntry: (coingeckoId, avgCostUSD) =>
        set((s) => ({
          entries: {
            ...s.entries,
            [coingeckoId]: { avgCostUSD, updatedAt: Date.now() },
          },
        })),
      removeEntry: (coingeckoId) =>
        set((s) => {
          const next = { ...s.entries };
          delete next[coingeckoId];
          return { entries: next };
        }),
    }),
    { name: "world-wallet-cost-basis" }
  )
);
