"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatUSD, formatScrubTime } from "@/lib/format";
import {
  computePortfolioInsights,
  generateMarketEvents,
  type AllocationSlice,
} from "@/lib/insights";
import { useMarketContext } from "@/hooks/useMarketContext";
import { useMarketNews } from "@/hooks/useMarketNews";
import { usePortfolioChart, type PortfolioHolding } from "@/hooks/usePortfolioChart";
import InteractiveLineChart, { type ScrubPoint } from "@/components/InteractiveLineChart";
import type { ChainBalance } from "@/hooks/useChainBalances";
import type { WldBalance } from "@/hooks/useWldBalance";
import type { ERC20Balance } from "@/hooks/useWorldChainTokenBalances";

// ── Portfolio snapshot (since you last opened) ──────────────────────

const SNAPSHOT_KEY = "world-wallet-portfolio-snapshot";

interface PortfolioSnapshot {
  value: number;
  timestamp: number;
}

interface ReturnDelta {
  usd: number;
  pct: number;
  elapsed: string;
}

function formatElapsedMs(ms: number): string {
  const h = ms / 3_600_000;
  if (h < 24) return `${Math.floor(h)}h ago`;
  const d = ms / 86_400_000;
  if (d < 14) return `${Math.floor(d)}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

// ── Mover datum ──────────────────────────────────────────────────────

interface MoverDatum {
  symbol: string;
  pct: number;
  usd: number;
}

// ── Props ───────────────────────────────────────────────────────────

interface PortfolioScreenProps {
  balances: ChainBalance[] | undefined;
  wldBalance: WldBalance | undefined;
  wldPriceChange: number | undefined;
  totalUSD: number;
  isLoading: boolean;
  tokenBalances?: ERC20Balance[];
}

// ── Time ranges ─────────────────────────────────────────────────────

type Days = 1 | 7 | 30 | 365;

const TIME_RANGES: { label: string; days: Days }[] = [
  { label: "1D", days: 1 },
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "1Y", days: 365 },
];

const PERIOD_LABELS: Record<string, string> = {
  "1": "today",
  "7": "this week",
  "30": "this month",
  "365": "this year",
};

// ── Component ───────────────────────────────────────────────────────

export default function PortfolioScreen({
  balances,
  wldBalance,
  wldPriceChange,
  totalUSD,
  isLoading,
  tokenBalances,
}: PortfolioScreenProps) {
  const [chartDays, setChartDays] = useState<Days>(1);
  const [scrubPoint, setScrubPoint] = useState<ScrubPoint | null>(null);
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);
  const [returnDelta, setReturnDelta] = useState<ReturnDelta | null>(null);

  // "Since you last opened" — read stored snapshot, then update it
  useEffect(() => {
    if (isLoading || totalUSD < 0.01) return;
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY);
      if (raw) {
        const prev: PortfolioSnapshot = JSON.parse(raw);
        const ms = Date.now() - prev.timestamp;
        if (ms >= 3_600_000 && prev.value > 0.01) {
          const usd = totalUSD - prev.value;
          const pct = (usd / prev.value) * 100;
          setReturnDelta({ usd, pct, elapsed: formatElapsedMs(ms) });
        }
      }
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ value: totalUSD, timestamp: Date.now() }));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const { data: market } = useMarketContext();
  const { data: news } = useMarketNews();

  // Compute insights
  const { insights, allocations, portfolioChange24h } = useMemo(
    () => computePortfolioInsights(balances, wldBalance, wldPriceChange, totalUSD),
    [balances, wldBalance, wldPriceChange, totalUSD],
  );

  // Market events
  const marketEvents = useMemo(() => {
    if (!market) return [];
    const heldIds = allocations.map((a) => a.id);
    return generateMarketEvents(
      market.marketCapChangePercent24h,
      market.btcDominance,
      portfolioChange24h,
      news?.coins ?? [],
      news?.categories ?? [],
      heldIds,
    );
  }, [market, news, portfolioChange24h, allocations]);

  // Top movers — sort holdings by absolute 24h % change, show top 3
  const topMovers: MoverDatum[] = useMemo(() => {
    const movers: MoverDatum[] = [];
    if (wldBalance && wldBalance.usd > 0.5) {
      movers.push({ symbol: "WLD", pct: wldPriceChange ?? 0, usd: wldBalance.usd });
    }
    for (const b of balances ?? []) {
      if (b.usdValue > 0.5 && b.priceChange24h != null) {
        movers.push({ symbol: b.chain.symbol, pct: b.priceChange24h, usd: b.usdValue });
      }
    }
    for (const t of tokenBalances ?? []) {
      if (t.balanceUSD > 0.5) {
        movers.push({ symbol: t.symbol, pct: t.priceChange24h, usd: t.balanceUSD });
      }
    }
    // Deduplicate by symbol — keep highest-USD entry per symbol
    const bySymbol = new Map<string, MoverDatum>();
    for (const m of movers) {
      const prev = bySymbol.get(m.symbol);
      if (!prev || m.usd > prev.usd) bySymbol.set(m.symbol, m);
    }
    return [...bySymbol.values()]
      .filter((m) => Math.abs(m.pct) > 0.1)
      .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
      .slice(0, 3);
  }, [balances, wldBalance, wldPriceChange, tokenBalances]);

  // Build holdings for chart
  const holdings: PortfolioHolding[] = useMemo(() => {
    const result: PortfolioHolding[] = [];
    if (wldBalance) {
      const amt = parseFloat(wldBalance.formatted);
      if (amt > 0) result.push({ coingeckoId: "worldcoin-wld", amount: amt });
    }
    for (const b of balances ?? []) {
      if (b.nativeBalance > 0 && b.chain.coingeckoId) {
        result.push({ coingeckoId: b.chain.coingeckoId, amount: b.nativeBalance });
      }
    }
    for (const t of tokenBalances ?? []) {
      if (t.balance > 0 && t.coingeckoId) {
        result.push({ coingeckoId: t.coingeckoId, amount: t.balance });
      }
    }
    return result;
  }, [balances, wldBalance, tokenBalances]);

  const { data: chartData, isLoading: chartLoading } = usePortfolioChart(holdings, chartDays);

  // Chart change calculation
  const chartChange = useMemo(() => {
    if (!chartData || chartData.length < 2) return null;
    const first = chartData[0][1];
    const last = chartData[chartData.length - 1][1];
    if (first === 0) return null;
    return { pct: ((last - first) / first) * 100, usd: last - first };
  }, [chartData]);

  const handleScrub = useCallback((point: ScrubPoint | null) => {
    setScrubPoint(point);
  }, []);

  // Display values — scrub overrides real values
  const displayValue = scrubPoint ? scrubPoint.value : totalUSD;
  const isScrubbing = scrubPoint !== null;

  const showAllocation = allocations.length >= 2;
  const hasInsights = insights.length > 0 || marketEvents.length > 0;

  return (
    <div className="pb-4">
      {/* Total value + period change */}
      <div className="px-5 pt-4 pb-2">
        {isLoading ? (
          <div className="space-y-2">
            <div className="skeleton rounded" style={{ width: 140, height: 32 }} />
            <div className="skeleton rounded" style={{ width: 100, height: 14 }} />
          </div>
        ) : (
          <>
            <p
              className="tabular-nums"
              style={{
                fontSize: 34,
                fontWeight: 700,
                color: "rgba(255,255,255,0.95)",
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
              }}
            >
              {formatUSD(displayValue)}
            </p>

            {isScrubbing ? (
              <p className="mt-1.5">
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  {formatScrubTime(scrubPoint.timestamp, chartDays)}
                </span>
              </p>
            ) : chartChange ? (
              <p className="mt-1.5 flex items-center gap-1.5">
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: chartChange.pct >= 0 ? "#4ade80" : "#f87171",
                  }}
                >
                  {chartChange.pct >= 0 ? "+" : "\u2013"}
                  {formatUSD(Math.abs(chartChange.usd))}
                </span>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: chartChange.pct >= 0 ? "#4ade80" : "#f87171",
                  }}
                >
                  {chartChange.pct >= 0 ? "+" : ""}
                  {chartChange.pct.toFixed(2)}%
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.2)",
                  }}
                >
                  {PERIOD_LABELS[String(chartDays)] ?? ""}
                </span>
              </p>
            ) : null}

            {/* Since you last opened */}
            {!isScrubbing && returnDelta && (
              <p className="mt-2 flex items-center gap-1.5">
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: returnDelta.usd >= 0 ? "rgba(74,222,128,0.6)" : "rgba(248,113,113,0.6)",
                  }}
                >
                  {returnDelta.usd >= 0 ? "+" : "\u2013"}
                  {formatUSD(Math.abs(returnDelta.usd))} ({returnDelta.pct >= 0 ? "+" : ""}{returnDelta.pct.toFixed(1)}%)
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.18)",
                  }}
                >
                  since {returnDelta.elapsed}
                </span>
              </p>
            )}
          </>
        )}
      </div>

      {/* Portfolio value chart */}
      <div className="px-2 mt-1">
        <InteractiveLineChart
          data={chartData}
          isLoading={chartLoading || isLoading}
          height={140}
          onScrub={handleScrub}
        />
      </div>

      {/* Time range tabs */}
      <div className="flex items-center gap-1 px-4 mt-2.5 mb-1">
        {TIME_RANGES.map((r) => {
          const active = chartDays === r.days;
          return (
            <button
              key={r.label}
              onClick={() => setChartDays(r.days)}
              className="px-3.5 py-1.5 rounded-full active:scale-90 transition-all duration-200"
              style={{
                background: active ? "rgba(255,255,255,0.09)" : "transparent",
              }}
            >
              <span
                className="tabular-nums"
                style={{
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  color: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.22)",
                  transition: "color 0.2s ease, font-weight 0.1s ease",
                }}
              >
                {r.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Allocation section */}
      {showAllocation && (
        <div className="mx-4 mt-5">
          <SectionLabel label="Allocation" />
          <div className="flex items-center gap-4 mt-2">
            <DonutChart
              slices={allocations}
              size={88}
              selectedId={selectedSlice}
              onSelect={setSelectedSlice}
            />
            <AllocationLegend
              slices={allocations}
              selectedId={selectedSlice}
              onSelect={setSelectedSlice}
            />
          </div>
        </div>
      )}

      {/* Top movers section */}
      {topMovers.length > 0 && !isLoading && (
        <div className="mx-4 mt-5">
          <SectionLabel label="Movers" />
          <div className="flex gap-2 mt-2">
            {topMovers.map((m) => {
              const up = m.pct >= 0;
              return (
                <div
                  key={m.symbol}
                  className="flex-1 rounded-[10px] px-3 py-2.5"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.75)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {m.symbol}
                    </span>
                    {up
                      ? <TrendingUp size={12} style={{ color: "#4ade80", opacity: 0.7 }} />
                      : <TrendingDown size={12} style={{ color: "#f87171", opacity: 0.7 }} />
                    }
                  </div>
                  <p
                    className="tabular-nums mt-0.5"
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: up ? "#4ade80" : "#f87171",
                    }}
                  >
                    {up ? "+" : ""}{m.pct.toFixed(2)}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Insights + market events section */}
      {hasInsights && (
        <div className="mx-4 mt-5">
          <SectionLabel label="Today" />
          <div
            className="rounded-[10px] py-2.5 px-3 mt-2"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <div className="space-y-0">
              {insights.map((insight) => (
                <ContextRow
                  key={insight.id}
                  text={insight.text}
                  sentiment={insight.sentiment}
                />
              ))}
              {marketEvents.map((event) => (
                <ContextRow
                  key={event.id}
                  text={event.text}
                  sentiment={event.sentiment}
                  dim
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p
        className="mx-4 mt-6 text-center"
        style={{ fontSize: 10, color: "rgba(255,255,255,0.1)", lineHeight: 1.4 }}
      >
        Chart assumes current holdings held for the period shown.
        {"\n"}Does not reflect past trades or deposits.
      </p>
    </div>
  );
}

// ── Section Label ───────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.07em",
        color: "rgba(255,255,255,0.3)",
        textTransform: "uppercase",
      }}
    >
      {label}
    </p>
  );
}

// ── Donut Chart ─────────────────────────────────────────────────────

function DonutChart({
  slices,
  size = 88,
  selectedId,
  onSelect,
}: {
  slices: AllocationSlice[];
  size?: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const gapFraction = 2 / 360;

  let cumulative = 0;
  const sliceData = slices.map((slice) => {
    const start = cumulative;
    const pctFraction = slice.pct / 100;
    cumulative += pctFraction;
    return { ...slice, start, end: cumulative, pctFraction };
  });

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - center;
    const y = e.clientY - rect.top - center;
    const dist = Math.sqrt(x * x + y * y);

    if (dist < radius - strokeWidth * 2 || dist > radius + strokeWidth * 2) {
      onSelect(null);
      return;
    }

    // Angle from top (12 o'clock), clockwise, in 0–1 range
    let angle = Math.atan2(x, -y);
    if (angle < 0) angle += 2 * Math.PI;
    const fraction = angle / (2 * Math.PI);

    for (const s of sliceData) {
      if (fraction <= s.end) {
        onSelect(s.id === selectedId ? null : s.id);
        return;
      }
    }
  };

  const hasSelection = selectedId !== null;

  return (
    <div className="flex-shrink-0">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        onClick={handleClick}
        style={{ cursor: "pointer" }}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={strokeWidth}
        />
        {sliceData.map((slice) => {
          const adjusted =
            sliceData.length > 1
              ? Math.max(slice.pctFraction - gapFraction, 0.005)
              : slice.pctFraction;
          const dashLength = adjusted * circumference;
          const dashGap = circumference - dashLength;
          const offset = -(slice.start * circumference);
          const isSelected = selectedId === slice.id;

          return (
            <circle
              key={slice.id}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={isSelected ? strokeWidth + 2 : strokeWidth}
              strokeDasharray={`${dashLength} ${dashGap}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
              style={{
                opacity: hasSelection ? (isSelected ? 1 : 0.2) : 0.8,
                transition: "opacity 0.15s ease, stroke-width 0.15s ease",
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}

// ── Allocation Legend ────────────────────────────────────────────────

function AllocationLegend({
  slices,
  selectedId,
  onSelect,
}: {
  slices: AllocationSlice[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const MAX_SHOWN = 5;
  const shown = slices.slice(0, MAX_SHOWN);
  const rest = slices.slice(MAX_SHOWN);
  const otherPct = rest.reduce((s, r) => s + r.pct, 0);
  const otherUsd = rest.reduce((s, r) => s + r.usd, 0);
  const hasSelection = selectedId !== null;

  return (
    <div className="flex-1 min-w-0 space-y-[6px]">
      {shown.map((slice) => {
        const isSelected = selectedId === slice.id;
        const dimmed = hasSelection && !isSelected;
        return (
          <button
            key={slice.id}
            onClick={() => onSelect(isSelected ? null : slice.id)}
            className="flex items-center gap-2.5 w-full text-left active:opacity-60 transition-opacity"
          >
            <div
              className="flex-shrink-0 rounded-full"
              style={{
                width: 7,
                height: 7,
                background: slice.color,
                opacity: dimmed ? 0.2 : 0.85,
                transition: "opacity 0.15s ease",
              }}
            />
            {/* Symbol — primary info */}
            <span
              style={{
                fontSize: 13,
                fontWeight: isSelected ? 700 : 600,
                color: dimmed ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.82)",
                transition: "color 0.15s ease",
                letterSpacing: "-0.01em",
              }}
            >
              {slice.symbol}
            </span>
            {/* Share — secondary */}
            <span
              className="tabular-nums ml-auto flex-shrink-0"
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: dimmed ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.3)",
                transition: "color 0.15s ease",
              }}
            >
              {slice.pct < 1 ? "<1" : Math.round(slice.pct)}%
            </span>
            {/* Value — secondary */}
            <span
              className="tabular-nums flex-shrink-0"
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: dimmed ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.45)",
                minWidth: 52,
                textAlign: "right",
                transition: "color 0.15s ease",
              }}
            >
              {formatUSD(slice.usd, true)}
            </span>
          </button>
        );
      })}
      {otherPct > 0.5 && (
        <div className="flex items-center gap-2">
          <div
            className="flex-shrink-0 rounded-full"
            style={{ width: 6, height: 6, background: "rgba(255,255,255,0.15)" }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "rgba(255,255,255,0.35)",
            }}
          >
            Other
          </span>
          <span
            className="tabular-nums ml-auto flex-shrink-0"
            style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.25)" }}
          >
            {Math.round(otherPct)}%
          </span>
          <span
            className="tabular-nums flex-shrink-0"
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "rgba(255,255,255,0.4)",
              minWidth: 48,
              textAlign: "right",
            }}
          >
            {formatUSD(otherUsd, true)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Context Row (unified for insights + market events) ──────────────

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#4ade80",
  negative: "#f87171",
  neutral: "rgba(255,255,255,0.22)",
};

function ContextRow({
  text,
  sentiment,
  dim = false,
}: {
  text: string;
  sentiment: "positive" | "negative" | "neutral";
  dim?: boolean;
}) {
  const dotColor = SENTIMENT_COLORS[sentiment] ?? SENTIMENT_COLORS.neutral;
  return (
    <div className="flex items-start gap-3 py-[3px]">
      <div
        className="flex-shrink-0 rounded-full mt-[5px]"
        style={{
          width: 5,
          height: 5,
          background: dotColor,
          opacity: dim ? 0.35 : 0.75,
        }}
      />
      <p
        style={{
          fontSize: 12.5,
          fontWeight: 400,
          color: dim ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.52)",
          lineHeight: 1.5,
        }}
      >
        {text}
      </p>
    </div>
  );
}
