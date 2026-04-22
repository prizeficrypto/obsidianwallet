"use client";

import { useState, useCallback } from "react";
import {
  ArrowLeft, ExternalLink, Share2,
  ArrowUpRight, ArrowDownLeft, TrendingUp,
  Bookmark, Pencil, X,
} from "lucide-react";
import { useTokenMarket, useTokenChart } from "@/hooks/useTokenDetail";
import { Loader2, Check } from "lucide-react";
import { useWatchlistStore } from "@/store/watchlistStore";
import { useCostBasisStore } from "@/store/costBasisStore";
import ChainIcon, { TokenIcon } from "@/components/ChainIcon";
import InteractiveLineChart, { type ScrubPoint } from "@/components/InteractiveLineChart";
import { renderPnlCard, sharePnlCard, type PnlCardData } from "@/lib/pnlCard";
import { formatScrubTime } from "@/lib/format";
import { useCurrency } from "@/hooks/useCurrency";
import { TOKEN_DESCRIPTIONS } from "@/lib/tokenDescriptions";
import type { SelectedToken } from "@/types/token";

function fmtBalance(value: number, symbol: string): string {
  if (value === 0)       return `0 ${symbol}`;
  if (value < 0.0001)   return `<0.0001 ${symbol}`;
  if (value < 1)        return `${value.toFixed(4)} ${symbol}`;
  if (value < 100)      return `${value.toFixed(3)} ${symbol}`;
  if (value < 10_000)   return `${value.toFixed(2)} ${symbol}`;
  return `${Math.round(value).toLocaleString()} ${symbol}`;
}

// ─── Chart ───────────────────────────────────────────────────────────────────

type Days = 1 | 7 | 30 | 365;

const TIME_RANGES: { label: string; days: Days }[] = [
  { label: "1D",  days: 1   },
  { label: "1W",  days: 7   },
  { label: "1M",  days: 30  },
  { label: "1Y",  days: 365 },
];

// ─── Stat row ────────────────────────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-[11px]">
      <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.35)" }}>
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.8)" }}>
        {value}
      </span>
    </div>
  );
}

function StatDivider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />;
}

function StatSkeleton() {
  return (
    <div className="flex items-center justify-between py-[11px]">
      <div className="skeleton rounded" style={{ width: 80, height: 11 }} />
      <div className="skeleton rounded" style={{ width: 60, height: 11 }} />
    </div>
  );
}

// ─── Action bar ───────────────────────────────────────────────────────────────

function ActionBar({
  onSend, onReceive, onSwap,
}: {
  onSend: () => void;
  onReceive: () => void;
  onSwap: () => void;
}) {
  const actions = [
    { label: "Send",    icon: <ArrowUpRight   size={18} strokeWidth={1.75} />, fn: onSend    },
    { label: "Receive", icon: <ArrowDownLeft  size={18} strokeWidth={1.75} />, fn: onReceive },
    { label: "Invest",  icon: <TrendingUp     size={18} strokeWidth={1.75} />, fn: onSwap    },
  ];

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {actions.map(({ label, icon, fn }) => (
        <button
          key={label}
          onClick={fn}
          className="flex flex-col items-center justify-center gap-[6px] py-[12px] rounded-xl active:bg-white/[0.05] active:scale-[0.94] transition-all duration-100"
          style={{ background: "#111111", color: "rgba(255,255,255,0.65)" }}
        >
          {icon}
          <span style={{ fontSize: 10.5, fontWeight: 500, color: "rgba(255,255,255,0.30)" }}>
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

interface TokenDetailScreenProps {
  token: SelectedToken;
  username?: string | null;
  onBack: () => void;
  onSend: () => void;
  onReceive: () => void;
  onSwap: () => void;
}

export default function TokenDetailScreen({
  token, username, onBack, onSend, onReceive, onSwap,
}: TokenDetailScreenProps) {
  const [days, setDays] = useState<number>(1);
  const [shareState, setShareState] = useState<"idle" | "sharing" | "done">("idle");
  const [scrubPoint, setScrubPoint] = useState<ScrubPoint | null>(null);
  const [editingCostBasis, setEditingCostBasis] = useState(false);
  const [costBasisInput, setCostBasisInput] = useState("");

  const { format, rate, symbol: currencySymbol } = useCurrency();
  const { entries: costBasisEntries, setEntry: setCostBasis, removeEntry: removeCostBasis } = useCostBasisStore();

  function fmtPrice(n: number | null | undefined): string {
    if (n == null || n === 0) return "—";
    const converted = n * rate;
    if (converted >= 1000) return format(n);
    if (converted >= 1)    return `${currencySymbol}${converted.toFixed(2)}`;
    if (converted >= 0.01) return `${currencySymbol}${converted.toFixed(4)}`;
    return `${currencySymbol}${converted.toFixed(6)}`;
  }

  function fmtCompact(n: number | null | undefined): string {
    if (n == null || n === 0) return "—";
    const converted = n * rate;
    if (converted >= 1e12) return `${currencySymbol}${(converted / 1e12).toFixed(2)}T`;
    if (converted >= 1e9)  return `${currencySymbol}${(converted / 1e9).toFixed(2)}B`;
    if (converted >= 1e6)  return `${currencySymbol}${(converted / 1e6).toFixed(2)}M`;
    if (converted >= 1e3)  return `${currencySymbol}${(converted / 1e3).toFixed(1)}K`;
    return `${currencySymbol}${converted.toFixed(2)}`;
  }

  const { has: isWatching, add: addWatch, remove: removeWatch } = useWatchlistStore();
  const watching = isWatching(token.coingeckoId);

  function toggleWatch() {
    if (watching) {
      removeWatch(token.coingeckoId);
    } else {
      addWatch({
        id: token.coingeckoId,
        symbol: token.symbol,
        name: token.symbol, // use symbol as name — detail screen doesn't expose full name
        logoURI: token.logoURI,
        chainIconId: token.chainIconId,
      });
    }
  }

  // hasMarketData — true when we have a real CoinGecko ID (not a 0x contract address fallback)
  const hasMarketData = !!token.coingeckoId && !token.coingeckoId.startsWith("0x");

  const { data: market, isLoading: marketLoading } = useTokenMarket(token.coingeckoId);
  const {
    data: chartData,
    isPlaceholderData: chartIsTransitioning,
    isLoading: chartLoading,
  } = useTokenChart(token.coingeckoId, days);

  const handleShare = useCallback(async () => {
    if (shareState !== "idle") return;
    setShareState("sharing");
    try {
      const cardData: PnlCardData = {
        symbol: token.symbol,
        price: market?.price ?? (token.balance > 0 ? token.balanceUSD / token.balance : 0),
        change24h: token.priceChange24h,
        balanceUSD: token.balanceUSD,
        balance: token.balance,
        network: token.network,
        sparkline: chartData ?? [],
        username: username ?? undefined,
      };
      const canvas = renderPnlCard(cardData);
      await sharePnlCard(canvas, token.symbol);
      setShareState("done");
      setTimeout(() => setShareState("idle"), 2000);
    } catch {
      setShareState("idle");
    }
  }, [shareState, token, market, chartData, username]);

  const handleScrub = useCallback((point: ScrubPoint | null) => {
    setScrubPoint(point);
  }, []);

  const price  = market?.price ?? (token.balance > 0 ? token.balanceUSD / token.balance : null);
  const change = token.priceChange24h;
  const isUp   = change >= 0;
  const changeColor = isUp ? "#4ade80" : "#f87171";
  const isScrubbing = scrubPoint !== null;

  // Scrub display values
  const displayPrice = isScrubbing ? scrubPoint.value : price;

  const explorerHref = token.contractAddress
    ? `${token.explorerUrl}/token/${token.contractAddress}`
    : token.explorerUrl;

  return (
    <div className="flex flex-col h-full overflow-hidden enter" style={{ background: "#0a0a0a" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center active:bg-white/5 active:scale-90 transition-all duration-100"
            style={{ background: "#181818" }}
          >
            <ArrowLeft size={17} strokeWidth={2} className="text-white/70" />
          </button>

          <div className="flex items-center gap-2.5">
            {token.chainIconId
              ? <ChainIcon chainId={token.chainIconId} size={28} />
              : <TokenIcon logoURI={token.logoURI} symbol={token.symbol} size={28} bg="#1A1040" />
            }
            <div>
              <p
                className="text-white font-semibold leading-none"
                style={{ fontSize: 15, letterSpacing: "-0.01em" }}
              >
                {token.symbol}
              </p>
              <p
                className="mt-[3px]"
                style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.3)" }}
              >
                {token.network}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Watch / Unwatch */}
          <button
            onClick={toggleWatch}
            className="flex items-center gap-1 py-1 active:opacity-50 transition-all duration-150"
            style={{ fontSize: 12, fontWeight: 500, color: watching ? "#6C5CE7" : "rgba(255,255,255,0.35)" }}
            aria-label={watching ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Bookmark
              size={10}
              strokeWidth={watching ? 0 : 1.75}
              fill={watching ? "#6C5CE7" : "none"}
            />
            {watching ? "Watching" : "Watch"}
          </button>

          <button
            onClick={handleShare}
            disabled={shareState === "sharing"}
            className="flex items-center gap-1 py-1 active:opacity-50 transition-all duration-150"
            style={{ fontSize: 12, fontWeight: 500, color: shareState === "done" ? "#4ade80" : "rgba(255,255,255,0.35)" }}
          >
            {shareState === "done" ? (
              <><Check size={10} strokeWidth={2} /> Saved</>
            ) : shareState === "sharing" ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <><Share2 size={10} strokeWidth={1.75} /> Share</>
            )}
          </button>
          <a
            href={explorerHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 py-1 active:opacity-50 transition-opacity"
            style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.25)" }}
          >
            Explorer
            <ExternalLink size={9} strokeWidth={1.75} />
          </a>
        </div>
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-10">

        {/* Price + 24h change (or scrub time) */}
        <div className="px-4 pt-4 pb-3">
          <p
            className="text-white font-bold tabular-nums leading-none"
            style={{ fontSize: 38, letterSpacing: "-0.03em" }}
          >
            {fmtPrice(displayPrice)}
          </p>
          <div className="flex items-baseline gap-1.5 mt-2" style={{ minHeight: 18 }}>
            {isScrubbing ? (
              <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>
                {formatScrubTime(scrubPoint.timestamp, days)}
              </span>
            ) : (
              <>
                <span
                  className="tabular-nums"
                  style={{ fontSize: 13, fontWeight: 500, color: changeColor }}
                >
                  {isUp ? "+" : ""}{change.toFixed(2)}%
                </span>
                <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.2)" }}>
                  24h
                </span>
              </>
            )}
          </div>
        </div>

        {/* Chart — interactive */}
        <div className="px-2">
          <InteractiveLineChart
            data={chartData && chartData.length > 0 ? chartData : null}
            isLoading={chartLoading && !chartIsTransitioning}
            height={130}
            dimmed={chartIsTransitioning}
            onScrub={handleScrub}
          />
        </div>

        {/* Time range tabs */}
        <div className="flex gap-0.5 px-4 pt-2 pb-1">
          {TIME_RANGES.map(({ label, days: d }) => {
            const isActive = days === d;
            const isLoading = isActive && chartIsTransitioning;
            return (
              <button
                key={label}
                onClick={() => setDays(d)}
                className="flex-1 py-[6px] rounded-lg text-[12px] transition-colors active:opacity-70 flex items-center justify-center gap-1"
                style={{
                  background: isActive ? "#1e1e1e" : "transparent",
                  color: isActive ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {isLoading && (
                  <Loader2 size={9} className="animate-spin" style={{ opacity: 0.5, flexShrink: 0 }} />
                )}
                {label}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="mt-4" style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />

        {/* Your balance + PnL — only shown when user holds this token */}
        {token.balance > 0 && (() => {
          const currentPrice = price ?? (token.balance > 0 ? token.balanceUSD / token.balance : 0);
          const dailyChangeUSD = token.balanceUSD * (token.priceChange24h / 100);
          const dailyChangePct = token.priceChange24h;
          const storedCostBasis = token.coingeckoId ? costBasisEntries[token.coingeckoId] : undefined;
          const avgCost = storedCostBasis?.avgCostUSD;
          const unrealizedPnL = avgCost && currentPrice ? (currentPrice - avgCost) * token.balance : null;
          const unrealizedPct = avgCost && avgCost > 0 && currentPrice ? ((currentPrice - avgCost) / avgCost) * 100 : null;

          return (
            <div className="px-4 pt-5 pb-1">
              <p style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.28)" }}>
                Your balance
              </p>
              <div className="flex items-baseline justify-between mt-2">
                <p
                  className="text-white font-bold tabular-nums leading-none"
                  style={{ fontSize: 24, letterSpacing: "-0.025em" }}
                >
                  {format(token.balanceUSD)}
                </p>
                <p
                  className="tabular-nums"
                  style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.3)" }}
                >
                  {fmtBalance(token.balance, token.symbol)}
                </p>
              </div>

              {/* Daily change */}
              <div className="flex items-center gap-2 mt-2.5">
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <span style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    24h
                  </span>
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: dailyChangePct >= 0 ? "#4ade80" : "#f87171",
                    }}
                  >
                    {dailyChangePct >= 0 ? "+" : "−"}{format(Math.abs(dailyChangeUSD))}
                    {" "}
                    <span style={{ fontWeight: 500, opacity: 0.75 }}>
                      ({dailyChangePct >= 0 ? "+" : ""}{dailyChangePct.toFixed(2)}%)
                    </span>
                  </span>
                </div>
              </div>

              {/* Unrealized PnL */}
              {unrealizedPnL !== null && unrealizedPct !== null && (
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      Total PnL
                    </span>
                    <span
                      className="tabular-nums"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: unrealizedPnL >= 0 ? "#4ade80" : "#f87171",
                      }}
                    >
                      {unrealizedPnL >= 0 ? "+" : "−"}{format(Math.abs(unrealizedPnL))}
                      {" "}
                      <span style={{ fontWeight: 500, opacity: 0.75 }}>
                        ({unrealizedPct >= 0 ? "+" : ""}{unrealizedPct.toFixed(2)}%)
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {/* Cost basis row */}
              {token.coingeckoId && (
                <div className="mt-2.5">
                  {editingCostBasis ? (
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", textTransform: "uppercase", flexShrink: 0 }}>
                        Avg cost
                      </span>
                      <div
                        className="flex items-center gap-1 flex-1 px-2 py-1 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{currencySymbol}</span>
                        <input
                          autoFocus
                          type="number"
                          min="0"
                          step="any"
                          value={costBasisInput}
                          onChange={(e) => setCostBasisInput(e.target.value)}
                          placeholder="0.00"
                          className="flex-1 bg-transparent text-sm text-white outline-none tabular-nums"
                          style={{ fontSize: 13, fontWeight: 500, minWidth: 0 }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const v = parseFloat(costBasisInput);
                              if (v > 0) setCostBasis(token.coingeckoId!, v / rate);
                              setEditingCostBasis(false);
                            }
                            if (e.key === "Escape") setEditingCostBasis(false);
                          }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          const v = parseFloat(costBasisInput);
                          if (v > 0) setCostBasis(token.coingeckoId!, v / rate);
                          setEditingCostBasis(false);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold active:opacity-70 transition-opacity"
                        style={{ background: "rgba(108,92,231,0.2)", color: "#9B8FFF" }}
                      >
                        Save
                      </button>
                      {avgCost && (
                        <button
                          onClick={() => { removeCostBasis(token.coingeckoId!); setEditingCostBasis(false); }}
                          className="active:opacity-50 transition-opacity"
                        >
                          <X size={13} style={{ color: "rgba(255,255,255,0.3)" }} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setCostBasisInput(avgCost ? (avgCost * rate).toFixed(2) : "");
                        setEditingCostBasis(true);
                      }}
                      className="flex items-center gap-1.5 active:opacity-60 transition-opacity"
                    >
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", letterSpacing: "0.02em" }}>
                        {avgCost
                          ? `Avg cost: ${currencySymbol}${(avgCost * rate).toLocaleString(undefined, { maximumFractionDigits: 4 })}`
                          : "Set avg cost basis"}
                      </span>
                      <Pencil size={9} style={{ color: "rgba(255,255,255,0.2)" }} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Actions */}
        <div className="px-4 pt-4 pb-2">
          <ActionBar
            onSend={onSend}
            onReceive={onReceive}
            onSwap={onSwap}
          />
        </div>

        {/* Divider */}
        <div className="mt-4" style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />

        {/* Market stats */}
        <div className="px-4 pt-4">
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.22)",
            }}
          >
            Market
          </p>
          <div className="mt-0.5">
            {marketLoading && hasMarketData ? (
              <>
                <StatSkeleton /><StatDivider />
                <StatSkeleton /><StatDivider />
                <StatSkeleton />
              </>
            ) : (
              <>
                <StatRow label="Market cap"    value={fmtCompact(market?.marketCap)} />
                <StatDivider />
                <StatRow label="24h volume"    value={fmtCompact(market?.volume24h)} />
                <StatDivider />
                <StatRow label="All-time high" value={fmtPrice(market?.ath)} />
              </>
            )}
          </div>
        </div>

        {/* About section */}
        {(() => {
          const desc = TOKEN_DESCRIPTIONS[token.coingeckoId];
          if (!desc) return null;
          return (
            <>
              <div className="mt-6" style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
              <div className="px-4 pt-4 pb-6">
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.22)",
                  }}
                >
                  About
                </p>
                <p
                  className="mt-2"
                  style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.85)", lineHeight: 1.35 }}
                >
                  {desc.title}
                </p>
                <p
                  className="mt-2"
                  style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}
                >
                  {desc.body}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {desc.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "rgba(255,255,255,0.4)",
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: 6,
                        padding: "3px 8px",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </>
          );
        })()}

      </div>
    </div>
  );
}
