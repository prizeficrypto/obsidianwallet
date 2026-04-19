"use client";
import { useI18nStore } from "@/store/i18nStore";
import { translations, type TranslationKey } from "@/lib/translations";

export function useTranslation() {
  const language = useI18nStore((s) => s.language);
  const t = (key: TranslationKey): string =>
    translations[language]?.[key] ?? translations.en[key] ?? key;
  return { t, language };
}
