import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Transaction } from "@/types/transaction";

// Cap history at 50 entries so localStorage stays small.
const MAX_HISTORY = 50;

interface TxStoreState {
  pending: Transaction[];
  history: Transaction[];

  addPending: (tx: Transaction) => void;
  updateTx: (hash: string, updates: Partial<Transaction>) => void;
  clearPending: () => void;
}

export const useTxStore = create<TxStoreState>()(
  persist(
    (set) => ({
      pending: [],
      history: [],

      addPending: (tx) =>
        set((state) => ({
          pending: [tx, ...state.pending],
        })),

      updateTx: (hash, updates) =>
        set((state) => {
          const pendingIdx = state.pending.findIndex((t) => t.hash === hash);
          if (pendingIdx >= 0) {
            const updated = { ...state.pending[pendingIdx], ...updates };
            const newPending = [...state.pending];
            newPending.splice(pendingIdx, 1);
            // If confirmed, move to history (capped at MAX_HISTORY)
            if (updated.status === "success" || updated.status === "failed") {
              return {
                pending: newPending,
                history: [updated, ...state.history].slice(0, MAX_HISTORY),
              };
            }
            newPending[pendingIdx] = updated;
            return { pending: newPending };
          }
          return state;
        }),

      clearPending: () => set({ pending: [] }),
    }),
    { name: "world-wallet-txs" }
  )
);
