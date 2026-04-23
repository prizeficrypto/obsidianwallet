"use client";

import { useSettingsStore } from "@/store/settingsStore";
import { useCurrency } from "@/hooks/useCurrency";
import type { ChainBalance } from "@/hooks/useChainBalances";
import type { SinceYouLeftData } from "@/lib/returnValue";

interface BalanceCardProps {
  totalUSD: number;
  balances: ChainBalance[] | undefined;
  isLoading: boolean;
  address: string | null;
  username: string | null;
  sparklineData?: [number, number][] | null;
  sinceYouLeft?: SinceYouLeftData | null;
  /** Portfolio-wide weighted 24h change (%), computed externally to include all assets */
  portfolioChange24h?: number;
}

// ── Mini sparkline ─────────────────────────────────────────────────────────────

function MiniSparkline({
  data,
  isUp,
}: {
  data: [number, number][];
  isUp: boolean;
}) {
  if (data.length < 2) return null;
  const W = 72;
  const H = 28;
  const values = data.map((d) => d[1]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pts = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((d[1] - min) / range) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" L ");

  const color = isUp ? "#4ade80" : "#f87171";

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ flexShrink: 0 }}
    >
      <path
        d={`M ${pts}`}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.65}
      />
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function BalanceCard({
  totalUSD,
  balances,
  isLoading,
  sparklineData,
  sinceYouLeft,
  portfolioChange24h,
}: BalanceCardProps) {
  const hideBalances = useSettingsStore((s) => s.hideBalances);
  const { format, symbol } = useCurrency();

  const freshBalances = balances?.filter((b) => !b.isStale) ?? [];
  const freshTotal = freshBalances.reduce((s, b) => s + b.usdValue, 0);
  const change24h = portfolioChange24h !== undefined
    ? portfolioChange24h
    : freshTotal > 0
      ? freshBalances.reduce(
          (sum, b) => sum + b.priceChange24h * (b.usdValue / freshTotal),
          0,
        )
      : 0;
  const changeUSD = (portfolioChange24h !== undefined ? totalUSD : freshTotal) * (change24h / 100);
  const isPositive = change24h >= 0;
  const changeColor = isPositive ? "#4ade80" : "#f87171";
  const neutralChange = Math.abs(change24h) < 0.005;

  const hasStaleBalances = balances?.some((b) => b.isStale && b.usdValue > 0) ?? false;

  // Sparkline direction from chart data (more accurate than weighted avg)
  const sparklineIsUp = sparklineData && sparklineData.length >= 2
    ? sparklineData[sparklineData.length - 1][1] >= sparklineData[0][1]
    : isPositive;

  return (
    <div
      className="mx-4 mt-1 px-5 pt-5 pb-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(170deg, #111114 0%, #0c0c0e 100%)",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Ambient depth */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -10,
          left: -40,
          right: 0,
          bottom: 0,
          background:
            "radial-gradient(ellipse 260px 130px at 15% 30%, rgba(255,255,255,0.03) 0%, transparent 70%)",
        }}
      />

      {/* Accent bar */}
      <div
        className="absolute top-0 left-5 right-5 pointer-events-none"
        style={{
          height: 1,
          background: `linear-gradient(90deg, transparent 0%, ${isPositive ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"} 30%, rgba(255,255,255,0.08) 70%, transparent 100%)`,
        }}
      />

      {isLoading ? (
        <div className="space-y-2.5 relative">
          <div className="skeleton rounded-lg" style={{ width: 170, height: 44 }} />
          <div className="skeleton rounded" style={{ width: 120, height: 13 }} />
        </div>
      ) : (
        <div className="relative">
          {/* Balance + sparkline on same row */}
          <div className="flex items-start justify-between gap-3">
            <p
              className="text-white font-bold leading-none tabular-nums"
              style={{ fontSize: 44, letterSpacing: "-0.04em" }}
            >
              {hideBalances ? `${symbol}••••••` : format(totalUSD)}
            </p>
            {!hideBalances && sparklineData && sparklineData.length >= 2 && (
              <div className="pt-2 pb-0 flex-shrink-0">
                <MiniSparkline data={sparklineData} isUp={sparklineIsUp} />
              </div>
            )}
          </div>

          {/* 24h change */}
          <div className="flex items-baseline gap-1.5 mt-3">
            {hideBalances ? (
              <span
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.18)",
                  fontWeight: 400,
                  letterSpacing: "0.05em",
                }}
              >
                ••••••
              </span>
            ) : neutralChange ? (
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontWeight: 400 }}>
                No change today
              </span>
            ) : (
              <>
                <span
                  className="tabular-nums"
                  style={{ fontSize: 13, fontWeight: 500, color: changeColor }}
                >
                  {isPositive ? "+" : "−"}{format(Math.abs(changeUSD))}
                </span>
                <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 12 }}>/</span>
                <span
                  className="tabular-nums"
                  style={{ fontSize: 13, fontWeight: 500, color: changeColor }}
                >
                  {isPositive ? "+" : ""}{change24h.toFixed(2)}%
                </span>
                <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.2)" }}>
                  today
                </span>
              </>
            )}
            {hasStaleBalances && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.18)",
                  marginLeft: 2,
                }}
              >
                · updating
              </span>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
