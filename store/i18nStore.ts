import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "en" | "fr" | "es" | "pt" | "id" | "de" | "vi" | "it";

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      language: "en",
      setLanguage: (language) => set({ language }),
    }),
    { name: "world-wallet-i18n" }
  )
);
