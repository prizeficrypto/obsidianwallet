"use client";

import { useState } from "react";
import { useI18nStore, type Language } from "@/store/i18nStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useTranslation } from "@/hooks/useTranslation";

// ─────────────────────────────────────────────────────────────────────────────
// Setup step 0: Language picker
// ─────────────────────────────────────────────────────────────────────────────

const LANGUAGES: { code: Language; flag: string; name: string }[] = [
  { code: "en", flag: "🇺🇸", name: "English" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
  { code: "es", flag: "🇪🇸", name: "Español" },
  { code: "pt", flag: "🇧🇷", name: "Português" },
  { code: "id", flag: "🇮🇩", name: "Indonesia" },
  { code: "de", flag: "🇩🇪", name: "Deutsch" },
  { code: "vi", flag: "🇻🇳", name: "Tiếng Việt" },
  { code: "it", flag: "🇮🇹", name: "Italiano" },
];

function LanguageStep({ onNext }: { onNext: () => void }) {
  const { language, setLanguage } = useI18nStore();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full" style={{ padding: "0 24px 36px" }}>
      <div className="flex-1 flex flex-col justify-center">
        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "white",
            letterSpacing: "-0.032em",
            lineHeight: 1.14,
            marginBottom: 8,
          }}
        >
          {t("setup.language.title")}
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.32)",
            marginBottom: 28,
            letterSpacing: "-0.008em",
          }}
        >
          {t("setup.language.subtitle")}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {LANGUAGES.map(({ code, flag, name }) => {
            const selected = language === code;
            return (
              <button
                key={code}
                onClick={() => setLanguage(code)}
                className="active:scale-[0.97] transition-transform"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "13px 14px",
                  borderRadius: 14,
                  background: selected
                    ? "rgba(255,255,255,0.09)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${
                    selected
                      ? "rgba(255,255,255,0.22)"
                      : "rgba(255,255,255,0.07)"
                  }`,
                  transition: "background 0.15s, border-color 0.15s",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>
                  {flag}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: selected ? 600 : 400,
                    color: selected
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(255,255,255,0.52)",
                    letterSpacing: "-0.01em",
                    transition: "color 0.15s, font-weight 0.15s",
                  }}
                >
                  {name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={onNext}
        className="active:scale-[0.98] transition-transform"
        style={{
          width: "100%",
          padding: "17px 0",
          borderRadius: 16,
          background: "#ffffff",
          color: "#111111",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: "-0.015em",
          border: "none",
          cursor: "pointer",
        }}
      >
        {t("onboarding.continue")}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup step 1: Currency picker
// ─────────────────────────────────────────────────────────────────────────────

type SupportedCurrency =
  | "USD" | "EUR" | "GBP" | "JPY" | "KRW" | "ARS"
  | "THB" | "CHF" | "CAD" | "BRL" | "TRY" | "INR" | "SGD" | "HKD";

const CURRENCIES: { code: SupportedCurrency; symbol: string; name: string }[] = [
  { code: "USD", symbol: "$",  name: "US Dollar"     },
  { code: "EUR", symbol: "€",  name: "Euro"          },
  { code: "GBP", symbol: "£",  name: "Pound"         },
  { code: "JPY", symbol: "¥",  name: "Yen"           },
  { code: "KRW", symbol: "₩",  name: "Won"           },
  { code: "BRL", symbol: "R$", name: "Real"          },
  { code: "CAD", symbol: "CA$",name: "CAD Dollar"    },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc"   },
  { code: "INR", symbol: "₹",  name: "Rupee"         },
  { code: "SGD", symbol: "S$", name: "SGD Dollar"    },
  { code: "HKD", symbol: "HK$",name: "HKD Dollar"    },
  { code: "ARS", symbol: "$",  name: "Peso"          },
  { code: "THB", symbol: "฿",  name: "Baht"          },
  { code: "TRY", symbol: "₺",  name: "Lira"          },
];

function CurrencyStep({ onNext }: { onNext: () => void }) {
  const { currency, setCurrency } = useSettingsStore();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full" style={{ padding: "0 24px 36px" }}>
      <div className="flex-1 flex flex-col justify-center">
        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "white",
            letterSpacing: "-0.032em",
            lineHeight: 1.14,
            marginBottom: 8,
          }}
        >
          {t("setup.currency.title")}
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.32)",
            marginBottom: 28,
            letterSpacing: "-0.008em",
          }}
        >
          {t("setup.currency.subtitle")}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {CURRENCIES.map(({ code, symbol, name }) => {
            const selected = currency === code;
            return (
              <button
                key={code}
                onClick={() => setCurrency(code)}
                className="active:scale-[0.97] transition-transform"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: selected
                    ? "rgba(255,255,255,0.09)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${
                    selected
                      ? "rgba(255,255,255,0.22)"
                      : "rgba(255,255,255,0.07)"
                  }`,
                  transition: "background 0.15s, border-color 0.15s",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: selected
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(255,255,255,0.28)",
                    minWidth: 22,
                    flexShrink: 0,
                    transition: "color 0.15s",
                  }}
                >
                  {symbol}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: selected ? 600 : 500,
                      color: selected
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(255,255,255,0.52)",
                      letterSpacing: "-0.01em",
                      transition: "color 0.15s",
                    }}
                  >
                    {code}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.22)",
                      letterSpacing: "-0.005em",
                      marginTop: 1,
                    }}
                  >
                    {name}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={onNext}
        className="active:scale-[0.98] transition-transform"
        style={{
          width: "100%",
          marginTop: 20,
          padding: "17px 0",
          borderRadius: 16,
          background: "#ffffff",
          color: "#111111",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: "-0.015em",
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {t("onboarding.continue")}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Art components
// ─────────────────────────────────────────────────────────────────────────────

function AllocationArt() {
  const items = [
    { symbol: "ETH",  usd: "$4,200", width: 196, color: "rgba(255,255,255,0.75)" },
    { symbol: "WLD",  usd: "$3,100", width: 152, color: "rgba(255,255,255,0.42)" },
    { symbol: "WBTC", usd: "$1,800", width: 104, color: "rgba(255,255,255,0.2)" },
  ];
  return (
    <div style={{ width: 240 }}>
      {items.map((item, i) => (
        <div key={item.symbol} style={{ marginBottom: i < items.length - 1 ? 14 : 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: "-0.01em" }}>
              {item.symbol}
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "-0.01em" }}>
              {item.usd}
            </span>
          </div>
          <div style={{ height: 10, width: item.width, borderRadius: 5, background: item.color }} />
        </div>
      ))}
    </div>
  );
}

function TokenRowsArt() {
  const rows = [
    { symbol: "WBTC", change: "+4.2%", up: true,  bars: [0.4, 0.5, 0.45, 0.65, 0.9] },
    { symbol: "ETH",  change: "+1.8%", up: true,  bars: [0.6, 0.5, 0.55, 0.6, 0.75] },
    { symbol: "uXRP", change: "−0.9%", up: false, bars: [0.8, 0.7, 0.75, 0.5, 0.4] },
  ];
  return (
    <div style={{ width: 248 }}>
      {rows.map((r, i) => (
        <div
          key={r.symbol}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 14px",
            borderRadius: 13,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.055)",
            marginBottom: i < rows.length - 1 ? 7 : 0,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)", letterSpacing: "-0.015em", width: 42, flexShrink: 0 }}>
            {r.symbol}
          </span>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 3, height: 18, margin: "0 12px" }}>
            {r.bars.map((h, j) => (
              <div
                key={j}
                style={{
                  flex: 1,
                  height: `${h * 100}%`,
                  borderRadius: 2,
                  background: r.up
                    ? `rgba(74,222,128,${0.18 + h * 0.45})`
                    : `rgba(248,113,113,${0.18 + h * 0.45})`,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: r.up ? "rgba(74,222,128,0.75)" : "rgba(248,113,113,0.75)", letterSpacing: "-0.01em", flexShrink: 0 }}>
            {r.change}
          </span>
        </div>
      ))}
      <p style={{ textAlign: "center", marginTop: 10, fontSize: 10, color: "rgba(255,255,255,0.18)", letterSpacing: "0.04em", fontWeight: 500 }}>
        50+ tokens on World Chain
      </p>
    </div>
  );
}

function InsightArt() {
  return (
    <div style={{ width: 248, borderRadius: 16, background: "#141414", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <p style={{ fontSize: 10, letterSpacing: "0.07em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", fontWeight: 500, marginBottom: 7 }}>
          Since Tuesday
        </p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.04em", color: "rgba(74,222,128,0.9)" }}>+2.8%</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.28)", letterSpacing: "-0.01em" }}>+$347</span>
        </div>
      </div>
      <div style={{ padding: "11px 16px 14px" }}>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginBottom: 4, letterSpacing: "0.03em" }}>Biggest driver</p>
        <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)", letterSpacing: "-0.015em" }}>WLD drove 60% of gains</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Slide definitions
// ─────────────────────────────────────────────────────────────────────────────

type SlideVariant = "art" | "list";

interface ArtSlide {
  id: string;
  variant: "art";
  art: React.ReactNode;
  title: string;
  body: string;
}

interface ListSlide {
  id: string;
  variant: "list";
  title: string;
  points: string[];
}

type Slide = ArtSlide | ListSlide;

const SLIDES: Slide[] = [
  {
    id: "product",
    variant: "art",
    art: <AllocationArt />,
    title: "Your World Chain\nportfolio.",
    body: "Track holdings, prices, and performance — built exclusively for World Chain.",
  },
  {
    id: "trade",
    variant: "art",
    art: <TokenRowsArt />,
    title: "Invest in any\ntoken, directly.",
    body: "Buy and sell 50+ tokens on World Chain at the best available market rate.",
  },
  {
    id: "insights",
    variant: "art",
    art: <InsightArt />,
    title: "Know what\nmoved.",
    body: "After every session, see exactly what drove your portfolio — no noise, no estimates.",
  },
  {
    id: "honest",
    variant: "list",
    title: "Good to\nknow.",
    points: [
      "World Chain only — this isn't a multichain wallet",
      "Portfolio data is based on your actual on-chain holdings",
      "Some historical performance figures may be estimated",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Dot indicator
// ─────────────────────────────────────────────────────────────────────────────

function Dots({ total, current, onTap }: { total: number; current: number; onTap: (i: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onTap(i)}
          style={{
            height: 5,
            width: i === current ? 20 : 5,
            borderRadius: 3,
            background: i === current ? "#ffffff" : "rgba(255,255,255,0.2)",
            transition: "all 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
            border: "none",
            padding: 0,
            cursor: "pointer",
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OnboardingScreen
// ─────────────────────────────────────────────────────────────────────────────

// setupStep: 0 = language, 1 = currency, 2+ = SLIDES[setupStep - 2]
export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [setupStep, setSetupStep] = useState(0);
  const { t } = useTranslation();

  const isSetup = setupStep < 2;
  const slideIndex = setupStep - 2;
  const slide = isSetup ? null : SLIDES[slideIndex];
  const isLast = !isSetup && slideIndex === SLIDES.length - 1;

  function advance() {
    if (isLast) onComplete();
    else setSetupStep((s) => s + 1);
  }

  function handleSkip() {
    onComplete();
  }

  return (
    <div
      className="flex flex-col h-screen select-none"
      style={{ background: "#080808", maxWidth: 430, margin: "0 auto" }}
    >
      {/* Skip */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "20px 24px 0", flexShrink: 0 }}>
        <button
          onClick={handleSkip}
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.24)",
            letterSpacing: "-0.01em",
            padding: "4px 8px",
            margin: "-4px -8px",
          }}
          className="active:opacity-50 transition-opacity"
        >
          {t("onboarding.skip")}
        </button>
      </div>

      {/* Setup steps */}
      {setupStep === 0 && (
        <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
          <LanguageStep onNext={() => setSetupStep(1)} />
        </div>
      )}

      {setupStep === 1 && (
        <div className="flex-1 flex flex-col overflow-y-auto" style={{ minHeight: 0 }}>
          <CurrencyStep onNext={() => setSetupStep(2)} />
        </div>
      )}

      {/* Slide steps */}
      {slide && slide.variant === "art" && (
        <>
          <div className="flex-1 flex items-center justify-center" style={{ padding: "0 24px" }}>
            <div key={`art-${slide.id}`} className="slide-enter">
              {slide.art}
            </div>
          </div>
          <div style={{ padding: "0 24px 36px", flexShrink: 0 }}>
            <h2
              key={`h-${slide.id}`}
              className="slide-enter"
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "white",
                letterSpacing: "-0.032em",
                lineHeight: 1.14,
                whiteSpace: "pre-line",
                marginBottom: 11,
              }}
            >
              {slide.title}
            </h2>
            <p
              key={`p-${slide.id}`}
              className="slide-enter"
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.36)",
                lineHeight: 1.65,
                letterSpacing: "-0.01em",
                marginBottom: 28,
              }}
            >
              {slide.body}
            </p>
            <Dots total={SLIDES.length} current={slideIndex} onTap={(i) => setSetupStep(i + 2)} />
            <button
              onClick={advance}
              className="active:scale-[0.98] transition-transform"
              style={{
                width: "100%",
                marginTop: 18,
                padding: "17px 0",
                borderRadius: 16,
                background: "#ffffff",
                color: "#111111",
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: "-0.015em",
                border: "none",
                cursor: "pointer",
              }}
            >
              {t("onboarding.continue")}
            </button>
          </div>
        </>
      )}

      {slide && slide.variant === "list" && (
        <>
          <div className="flex-1 flex flex-col justify-center" style={{ padding: "0 24px" }}>
            <h2
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "white",
                letterSpacing: "-0.032em",
                lineHeight: 1.14,
                whiteSpace: "pre-line",
                marginBottom: 30,
              }}
            >
              {slide.title}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {slide.points.map((point, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.5)",
                      flexShrink: 0,
                      marginTop: 6,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 15,
                      color: "rgba(255,255,255,0.48)",
                      lineHeight: 1.55,
                      letterSpacing: "-0.012em",
                    }}
                  >
                    {point}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: "0 24px 36px", flexShrink: 0 }}>
            <Dots total={SLIDES.length} current={slideIndex} onTap={(i) => setSetupStep(i + 2)} />
            <button
              onClick={onComplete}
              className="active:scale-[0.98] transition-transform"
              style={{
                width: "100%",
                marginTop: 18,
                padding: "17px 0",
                borderRadius: 16,
                background: "#ffffff",
                color: "#111111",
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: "-0.015em",
                border: "none",
                cursor: "pointer",
              }}
            >
              {t("onboarding.getStarted")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
