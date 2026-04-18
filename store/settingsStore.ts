import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  currency: "USD" | "EUR" | "GBP" | "JPY" | "KRW" | "ARS" | "THB" | "CHF" | "CAD" | "BRL" | "TRY" | "INR" | "SGD" | "HKD";
  hideBalances: boolean;
  haptics: boolean;
  primaryChain: string;

  setCurrency: (c: SettingsState["currency"]) => void;
  setHideBalances: (hide: boolean) => void;
  setHaptics: (enabled: boolean) => void;
  setPrimaryChain: (chainId: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      currency: "USD",
      hideBalances: false,
      haptics: true,
      primaryChain: "world-chain",

      setCurrency: (currency) => set({ currency }),
      setHideBalances: (hideBalances) => set({ hideBalances }),
      setHaptics: (haptics) => set({ haptics }),
      setPrimaryChain: (primaryChain) => set({ primaryChain }),
    }),
    { name: "world-wallet-settings" }
  )
);
