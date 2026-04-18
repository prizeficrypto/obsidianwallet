"use client";

import { useQuery } from "@tanstack/react-query";
import { useSettingsStore } from "@/store/settingsStore";

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", KRW: "₩",
  ARS: "$", THB: "฿", CHF: "CHF ", CAD: "CA$", BRL: "R$",
  TRY: "₺", INR: "₹", SGD: "S$", HKD: "HK$",
};

export const CURRENCY_NAMES: Record<string, string> = {
  USD: "US Dollar", EUR: "Euro", GBP: "British Pound",
  JPY: "Japanese Yen", KRW: "South Korean Won",
  ARS: "Argentine Peso", THB: "Thai Baht",
  CHF: "Swiss Franc", CAD: "Canadian Dollar",
  BRL: "Brazilian Real", TRY: "Turkish Lira",
  INR: "Indian Rupee", SGD: "Singapore Dollar", HKD: "Hong Kong Dollar",
};

// Currencies with no fractional cents (round to integer)
const NO_DECIMALS = new Set(["JPY", "KRW", "ARS"]);

const FALLBACK_RATES: Record<string, number> = {
  eur: 0.92, gbp: 0.79, jpy: 153.5, krw: 1370, ars: 910,
  thb: 35.1, chf: 0.89, cad: 1.38, brl: 5.15, try: 32.8,
  inr: 83.5, sgd: 1.35, hkd: 7.82,
};

export function useCurrency() {
  const currency = useSettingsStore((s) => s.currency);

  const { data: rates } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async () => {
      const res = await fetch("/api/exchange-rates");
      if (!res.ok) return FALLBACK_RATES;
      return res.json() as Promise<Record<string, number>>;
    },
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  const symbol = CURRENCY_SYMBOLS[currency] ?? "$";
  const rateKey = currency.toLowerCase();
  const rate = currency === "USD" ? 1 : (rates?.[rateKey] ?? FALLBACK_RATES[rateKey] ?? 1);
  const noDecimals = NO_DECIMALS.has(currency);

  function format(usdAmount: number): string {
    const n = usdAmount * rate;
    if (n === 0) return noDecimals ? `${symbol}0` : `${symbol}0.00`;
    if (noDecimals) {
      if (n >= 1_000_000) return `${symbol}${Math.round(n / 1_000_000).toLocaleString()}M`;
      return `${symbol}${Math.round(n).toLocaleString()}`;
    }
    if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1000) return `${symbol}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `${symbol}${n.toFixed(2)}`;
  }

  return { currency, symbol, rate, format };
}
