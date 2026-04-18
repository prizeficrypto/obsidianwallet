"use client";

import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Art components
//
// These are UI-adjacent — they look like abstracted pieces of the real app,
// not generic illustrations. Each previews an actual feature without being
// a tutorial screenshot.
// ─────────────────────────────────────────────────────────────────────────────

// Slide 1: Portfolio allocation bars — the same visual language as the Strata
// mark, but each bar is labeled with a token and proportional to a holding.
function AllocationArt() {
  const items = [
    { symbol: "ETH",  usd: "$4,200", width: 196, color: "rgba(108,92,231,0.72)" },
    { symbol: "WLD",  usd: "$3,100", width: 152, color: "rgba(108,92,231,0.44)" },
    { symbol: "WBTC", usd: "$1,800", width: 104, color: "rgba(108,92,231,0.24)" },
  ];
  return (
    <div style={{ width: 240 }}>
      {items.map((item, i) => (
        <div key={item.symbol} style={{ marginBottom: i < items.length - 1 ? 14 : 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "-0.01em",
              }}
            >
              {item.symbol}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.2)",
                letterSpacing: "-0.01em",
              }}
            >
              {item.usd}
            </span>
          </div>
          <div
            style={{
              height: 10,
              width: item.width,
              borderRadius: 5,
              background: item.color,
            }}
          />
        </div>
      ))}
    </div>
  );
}

// Slide 2: Token rows with micro bar charts — an abstracted version of the
// token list the user will actually see when they open the app.
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
          {/* Symbol */}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255,255,255,0.55)",
              letterSpacing: "-0.015em",
              width: 42,
              flexShrink: 0,
            }}
          >
            {r.symbol}
          </span>

          {/* Micro bar chart */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "flex-end",
              gap: 3,
              height: 18,
              margin: "0 12px",
            }}
          >
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

          {/* Change */}
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: r.up
                ? "rgba(74,222,128,0.75)"
                : "rgba(248,113,113,0.75)",
              letterSpacing: "-0.01em",
              flexShrink: 0,
            }}
          >
            {r.change}
          </span>
        </div>
      ))}

      <p
        style={{
          textAlign: "center",
          marginTop: 10,
          fontSize: 10,
          color: "rgba(255,255,255,0.18)",
          letterSpacing: "0.04em",
          fontWeight: 500,
        }}
      >
        50+ tokens on World Chain
      </p>
    </div>
  );
}

// Slide 3: "Since you left" insight card — a direct preview of the real
// feature that gives users a reason to return after market moves.
function InsightArt() {
  return (
    <div
      style={{
        width: 248,
        borderRadius: 16,
        background: "#141414",
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
      }}
    >
      {/* Header row */}
      <div
        style={{
          padding: "14px 16px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.07em",
            color: "rgba(255,255,255,0.25)",
            textTransform: "uppercase",
            fontWeight: 500,
            marginBottom: 7,
          }}
        >
          Since Tuesday
        </p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: "rgba(74,222,128,0.9)",
            }}
          >
            +2.8%
          </span>
          <span
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.28)",
              letterSpacing: "-0.01em",
            }}
          >
            +$347
          </span>
        </div>
      </div>

      {/* Insight row */}
      <div style={{ padding: "11px 16px 14px" }}>
        <p
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.22)",
            marginBottom: 4,
            letterSpacing: "0.03em",
          }}
        >
          Biggest driver
        </p>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "-0.015em",
          }}
        >
          WLD drove 60% of gains
        </p>
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
    body: "Obsidian tracks your holdings, prices, and performance. Built for World Chain — nothing else.",
  },
  {
    id: "trade",
    variant: "art",
    art: <TokenRowsArt />,
    title: "Trade any token,\ndirectly.",
    body: "Swap across 50+ World Chain tokens at the best available rate via Uniswap V3. No bridges.",
  },
  {
    id: "insights",
    variant: "art",
    art: <InsightArt />,
    title: "Know what\nmoved.",
    body: "See which holdings drove your gains or losses after every market session. One card, clearly explained.",
  },
  {
    id: "honest",
    variant: "list",
    title: "Good to\nknow.",
    points: [
      "World Chain only — this isn't a multichain wallet",
      "Portfolio insights are based on your actual holdings",
      "Some historical performance data may be estimated",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Dot indicator
// ─────────────────────────────────────────────────────────────────────────────

function Dots({
  total,
  current,
  onTap,
}: {
  total: number;
  current: number;
  onTap: (i: number) => void;
}) {
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
            background:
              i === current
                ? "#6C5CE7"
                : "rgba(255,255,255,0.14)",
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

export default function OnboardingScreen({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  function advance() {
    if (isLast) onComplete();
    else setIndex((i) => i + 1);
  }

  return (
    <div
      className="flex flex-col h-screen select-none"
      style={{ background: "#080808", maxWidth: 430, margin: "0 auto" }}
    >
      {/* Skip */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "20px 24px 0",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onComplete}
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.24)",
            letterSpacing: "-0.01em",
            padding: "4px 8px",
            margin: "-4px -8px",
          }}
          className="active:opacity-50 transition-opacity"
        >
          Skip
        </button>
      </div>

      {slide.variant === "art" ? (
        // ── Art layout (slides 1–3) ───────────────────────────────────────────
        <>
          {/* Art — grows to fill available space, centered */}
          <div
            className="flex-1 flex items-center justify-center"
            style={{ padding: "0 24px" }}
          >
            <div key={`art-${slide.id}`} className="slide-enter">
              {slide.art}
            </div>
          </div>

          {/* Text + nav */}
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

            <Dots total={SLIDES.length} current={index} onTap={setIndex} />

            <button
              onClick={advance}
              className="active:scale-[0.98] transition-transform"
              style={{
                width: "100%",
                marginTop: 18,
                padding: "17px 0",
                borderRadius: 16,
                background: "#6C5CE7",
                color: "white",
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: "-0.015em",
                border: "none",
                cursor: "pointer",
              }}
            >
              Continue
            </button>
          </div>
        </>
      ) : (
        // ── List layout (slide 4 — honest context) ───────────────────────────
        // Deliberately different from the art slides: no hero visual,
        // information-dense, signals "this is the real talk" before CTA.
        <>
          <div
            className="flex-1 flex flex-col justify-center"
            style={{ padding: "0 24px" }}
          >
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
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "flex-start", gap: 13 }}
                >
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "rgba(108,92,231,0.65)",
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
            <Dots total={SLIDES.length} current={index} onTap={setIndex} />

            <button
              onClick={onComplete}
              className="active:scale-[0.98] transition-transform"
              style={{
                width: "100%",
                marginTop: 18,
                padding: "17px 0",
                borderRadius: 16,
                background: "#6C5CE7",
                color: "white",
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: "-0.015em",
                border: "none",
                cursor: "pointer",
              }}
            >
              Open my portfolio
            </button>
          </div>
        </>
      )}
    </div>
  );
}
