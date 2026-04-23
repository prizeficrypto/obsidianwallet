"use client";

/**
 * MarketsSection — tabbed home-screen discovery surface.
 *
 * Three tabs, one unified card:
 *   Trending  — curated top tokens in priority order
 *   Movers    — same tokens re-sorted by absolute 24h change (biggest moves first)
 *   Watchlist — user's personally tracked tokens + add/remove management
 *
 * Every row shows: icon · symbol + name · 7-day sparkline · price · 24h change.
 * The sparkline is the key element that makes the section feel alive: it shows
 * the token's trajectory over the past week at a glance, not just a number.
 *
 * Data:
 *   - prices:    from WalletApp's useTokenPrices (covers all tokens)
 *   - sparklines: fetched here for the combined curated + watchlist set
 *   - watchlist:  zustand store (persisted)
 */

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWatchlistStore, type WatchToken } from "@/store/watchlistStore";
import { CURATED_WATCH_TOKENS } from "@/lib/watchlistTokens";
import { SEARCH_TOKENS } from "@/lib/searchTokens";
import ChainIcon, { TokenIcon } from "@/components/ChainIcon";
import { formatPercent } from "@/lib/format";
import { useCurrency } from "@/hooks/useCurrency";
import type { SelectedToken } from "@/types/token";

// ── Curated token set for Trending / Movers tabs ──────────────────────────────

const STABLECOIN_IDS = new Set(["usd-coin", "tether"]);

const PRIORITY_CG_IDS = [
  "worldcoin-wld",
  "ethereum",
  "wrapped-bitcoin",
  "solana",
  "ripple",
  "dogecoin",
  "cardano",
  "chainlink",
  "tether-gold",
  "sui",
  "stellar",
];

// Build rich token metadata from SEARCH_TOKENS keyed by coingeckoId
const CURATED_META: Record<string, {
  symbol: string;
  name: string;
  logoURI: string;
  contractAddress: string;
  cgId: string;
}> = {};
for (const t of SEARCH_TOKENS) {
  if (t.coingeckoId && !STABLECOIN_IDS.has(t.coingeckoId)) {
    CURATED_META[t.coingeckoId] = {
      symbol: t.symbol,
      name: t.name,
      logoURI: t.logoURI,
      contractAddress: t.contractAddress,
      cgId: t.coingeckoId,
    };
  }
}

const CURATED_TOKENS = PRIORITY_CG_IDS
  .map((id) => CURATED_META[id])
  .filter(Boolean);

// ── Sparkline fetcher (7-day, ~40 points) ────────────────────────────────────

function useSparklines(ids: string[]): Record<string, number[]> {
  const key = ids.slice().sort().join(",");
  const { data } = useQuery({
    queryKey: ["market-sparklines", key],
    queryFn: async () => {
      if (!ids.length) return {};
      const res = await fetch(`/api/sparklines?ids=${ids.join(",")}`);
      if (!res.ok) return {};
      return res.json() as Promise<Record<string, number[]>>;
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry: 1,
  });
  return data ?? {};
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtPrice(usd: number, rate: number, sym: string): string {
  if (usd <= 0) return "—";
  const n = usd * rate;
  if (n >= 1_000) return `${sym}${Math.round(n).toLocaleString()}`;
  if (n >= 1)     return `${sym}${n.toFixed(2)}`;
  if (n >= 0.01)  return `${sym}${n.toFixed(4)}`;
  return `${sym}${n.toFixed(6)}`;
}

// ── MiniSparkline ─────────────────────────────────────────────────────────────

function MiniSparkline({ prices, isUp }: { prices: number[]; isUp: boolean }) {
  if (prices.length < 2) return <div style={{ width: 56, flexShrink: 0 }} />;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 56;
  const H = 26;

  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * W;
    const y = H - ((p - min) / range) * (H - 3) - 1.5;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const color = isUp ? "#4ade80" : "#f87171";

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ flexShrink: 0 }}>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.75}
      />
    </svg>
  );
}

// ── Token row ─────────────────────────────────────────────────────────────────

function TokenRow({
  symbol,
  name,
  logoURI,
  cgId,
  contractAddress,
  priceUSD,
  change24h,
  sparkline,
  isHeld,
  heldUSD,
  onTap,
  onRemove,
  isLast,
}: {
  symbol: string;
  name: string;
  logoURI?: string;
  cgId: string;
  contractAddress?: string;
  priceUSD: number;
  change24h: number;
  sparkline: number[];
  isHeld: boolean;
  heldUSD: number;
  onTap: () => void;
  onRemove?: () => void;
  isLast: boolean;
}) {
  const { rate, symbol: currSym } = useCurrency();
  const isUp = change24h >= 0;
  const hasPct = Math.abs(change24h) >= 0.01;
  const changeColor = isUp ? "#4ade80" : "#f87171";

  // Strip "u" prefix from Universal Protocol tokens for display
  const displaySymbol = symbol.startsWith("u") && symbol.length > 1
    ? symbol.slice(1)
    : symbol;

  const displayValue = isHeld && heldUSD >= 0.01
    ? heldUSD >= 1_000
      ? `${currSym}${Math.round(heldUSD * rate).toLocaleString()}`
      : `${currSym}${(heldUSD * rate).toFixed(2)}`
    : fmtPrice(priceUSD, rate, currSym);

  return (
    <div>
      <div className="flex items-center" style={{ paddingRight: onRemove ? 4 : 0 }}>
        <button
          onClick={onTap}
          className="flex-1 flex items-center gap-3 active:bg-white/[0.03] transition-colors"
          style={{ padding: "10px 16px", minWidth: 0 }}
        >
          {/* Icon */}
          <div style={{ flexShrink: 0 }}>
            <TokenIcon logoURI={logoURI} symbol={symbol} size={36} bg="#1a1a1a" />
          </div>

          {/* Name */}
          <div style={{ flex: "0 0 auto", minWidth: 0, width: 52 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)", letterSpacing: "-0.012em", lineHeight: 1 }}>
              {displaySymbol}
            </p>
            {isHeld && (
              <div
                style={{
                  marginTop: 4,
                  display: "inline-block",
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "rgba(74,222,128,0.55)",
                }}
              />
            )}
          </div>

          {/* Sparkline — flex-grow so it fills available space */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <MiniSparkline prices={sparkline} isUp={isUp} />
          </div>

          {/* Price + change */}
          <div style={{ flexShrink: 0, textAlign: "right", minWidth: 68 }}>
            <p
              className="tabular-nums"
              style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.78)", letterSpacing: "-0.012em", lineHeight: 1 }}
            >
              {displayValue}
            </p>
            {hasPct && priceUSD > 0 && (
              <p
                className="tabular-nums"
                style={{ fontSize: 11, fontWeight: 500, color: changeColor, marginTop: 4, lineHeight: 1 }}
              >
                {formatPercent(change24h)}
              </p>
            )}
          </div>
        </button>

        {/* Remove button (Watchlist tab only) */}
        {onRemove && (
          <button
            onClick={onRemove}
            style={{ padding: "10px 12px 10px 4px", color: "rgba(255,255,255,0.15)", flexShrink: 0 }}
            className="active:opacity-50 transition-opacity"
          >
            <X size={12} strokeWidth={2} />
          </button>
        )}
      </div>

      {!isLast && (
        <div style={{ height: 1, background: "rgba(255,255,255,0.04)", marginLeft: 64 }} />
      )}
    </div>
  );
}

// ── Token Picker sheet (Watchlist add) ────────────────────────────────────────

function TokenPicker({ onClose }: { onClose: () => void }) {
  const { tokens, add, remove, has } = useWatchlistStore();

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9998 }}
      />
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            width: "100%",
            maxWidth: 430,
            background: "#111111",
            borderRadius: "20px 20px 0 0",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            maxHeight: "72vh",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              position: "sticky",
              top: 0,
              background: "#111111",
              padding: "12px 20px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              zIndex: 1,
            }}
          >
            <div style={{ width: 32, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "0 auto 16px" }} />
            <div className="flex items-center justify-between">
              <p style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.88)", letterSpacing: "-0.01em" }}>
                Add to Watchlist
              </p>
              <button onClick={onClose} style={{ color: "rgba(255,255,255,0.28)", padding: "4px", margin: "-4px" }} className="active:opacity-50 transition-opacity">
                <X size={17} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div style={{ paddingTop: 4, paddingBottom: "env(safe-area-inset-bottom, 24px)" }}>
            {CURATED_WATCH_TOKENS.map((token, i) => {
              const watching = has(token.id);
              return (
                <div key={token.id}>
                  <button
                    onClick={() => watching ? remove(token.id) : add(token)}
                    className="w-full flex items-center gap-3 px-5 active:bg-white/[0.03] transition-colors text-left"
                    style={{ paddingTop: 12, paddingBottom: 12 }}
                  >
                    <TokenIcon logoURI={token.logoURI} symbol={token.symbol} size={32} bg="#1a1a1a" />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                        {token.symbol}
                      </p>
                      <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.3)", marginTop: 3, lineHeight: 1.2 }}>
                        {token.name.replace(" (Universal)", "")}
                      </p>
                    </div>
                    <div
                      style={{
                        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                        border: watching ? "none" : "1.5px solid rgba(255,255,255,0.18)",
                        background: watching ? "rgba(255,255,255,0.18)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background 0.12s",
                      }}
                    >
                      {watching && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </button>
                  {i < CURATED_WATCH_TOKENS.length - 1 && (
                    <div style={{ height: 1, marginLeft: 68, marginRight: 20, background: "rgba(255,255,255,0.04)" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type MarketTab = "Trending" | "Movers" | "Watchlist";

interface MarketsRailProps {
  prices: Record<string, { usd: number; usd_24h_change: number }> | undefined;
  balanceMap?: Record<string, number>;
  onTokenTap: (token: SelectedToken) => void;
  onSeeAll: () => void;
}

export default function MarketsRail({ prices, balanceMap, onTokenTap }: MarketsRailProps) {
  const [activeTab, setActiveTab] = useState<MarketTab>("Trending");
  const [pickerOpen, setPickerOpen] = useState(false);

  const { tokens: watchTokens, remove: removeWatch } = useWatchlistStore();

  // Combined sparkline fetch: curated + watchlist IDs
  const allIds = useMemo(() => {
    const ids = new Set<string>(PRIORITY_CG_IDS);
    for (const t of watchTokens) ids.add(t.id);
    return [...ids];
  }, [watchTokens]);

  const sparklines = useSparklines(allIds);

  // ── Build curated token rows ──────────────────────────────────────────────
  const curatedRows = useMemo(() => {
    if (!prices) return [];
    return CURATED_TOKENS.map((t) => {
      const pd = prices[t.cgId];
      const bal = balanceMap?.[t.contractAddress?.toLowerCase() ?? ""] ?? 0;
      const balUSD = bal > 0 && pd ? bal * pd.usd : 0;
      return {
        ...t,
        priceUSD: pd?.usd ?? 0,
        change24h: pd?.usd_24h_change ?? 0,
        sparkline: sparklines[t.cgId] ?? [],
        isHeld: bal > 0.0000001,
        heldUSD: balUSD,
      };
    });
  }, [prices, balanceMap, sparklines]);

  // Trending = priority order; Movers = sorted by |change24h| desc
  const trendingRows = curatedRows;
  const moversRows = useMemo(
    () => [...curatedRows].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h)),
    [curatedRows]
  );

  // ── Build watchlist rows ──────────────────────────────────────────────────
  const watchRows = useMemo(() => {
    if (!watchTokens.length) return [];
    return watchTokens.map((t) => {
      const pd = prices?.[t.id];
      // Find contract address from SEARCH_TOKENS
      const meta = SEARCH_TOKENS.find((s) => s.coingeckoId === t.id);
      const bal = meta ? (balanceMap?.[meta.contractAddress.toLowerCase()] ?? 0) : 0;
      const balUSD = bal > 0 && pd ? bal * pd.usd : 0;
      return {
        id: t.id,
        symbol: t.symbol,
        name: t.name,
        logoURI: t.logoURI,
        contractAddress: meta?.contractAddress,
        priceUSD: pd?.usd ?? 0,
        change24h: pd?.usd_24h_change ?? 0,
        sparkline: sparklines[t.id] ?? [],
        isHeld: bal > 0.0000001,
        heldUSD: balUSD,
      };
    });
  }, [watchTokens, prices, balanceMap, sparklines]);

  if (!prices) return null;

  const activeRows = activeTab === "Trending"
    ? trendingRows
    : activeTab === "Movers"
    ? moversRows
    : watchRows;

  const TABS: MarketTab[] = ["Trending", "Movers", "Watchlist"];

  function buildSelectedToken(row: typeof activeRows[number]): SelectedToken {
    return {
      symbol: row.symbol,
      coingeckoId: "id" in row ? (row as { id: string }).id : row.cgId ?? "",
      logoURI: row.logoURI,
      network: "World Chain",
      balance: 0,
      balanceUSD: row.heldUSD,
      priceChange24h: row.change24h,
      explorerUrl: "https://worldscan.org",
      contractAddress: row.contractAddress,
    };
  }

  return (
    <div className="mt-4 mb-2">
      {/* ── Section header with tabs ────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 mb-2">
        {/* Tabs */}
        <div className="flex items-center gap-4">
          {TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="active:opacity-60 transition-opacity relative"
                style={{ padding: "2px 0" }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: active ? 600 : 500,
                    letterSpacing: active ? "0.05em" : "0.07em",
                    textTransform: "uppercase",
                    color: active ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.22)",
                    transition: "color 0.15s",
                  }}
                >
                  {tab}
                </span>
                {active && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: -1,
                      left: 0,
                      right: 0,
                      height: 1.5,
                      borderRadius: 1,
                      background: "rgba(255,255,255,0.45)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Watchlist add button */}
        {activeTab === "Watchlist" && (
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1 active:opacity-60 transition-opacity"
            style={{ color: "rgba(255,255,255,0.28)", padding: "2px 0" }}
          >
            <Plus size={12} strokeWidth={2} />
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "-0.01em" }}>Add</span>
          </button>
        )}
      </div>

      {/* ── Token list card ─────────────────────────────────────────────── */}
      <div
        style={{
          margin: "0 16px",
          borderRadius: 14,
          background: "#111111",
          border: "1px solid rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        {activeTab === "Watchlist" && watchRows.length === 0 ? (
          /* Empty watchlist state */
          <button
            onClick={() => setPickerOpen(true)}
            className="w-full active:opacity-70 transition-opacity"
            style={{ padding: "20px 16px", textAlign: "center" }}
          >
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", letterSpacing: "-0.01em" }}>
              Track tokens before you buy
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", marginTop: 4, letterSpacing: "-0.005em" }}>
              Tap + Add to start watching
            </p>
          </button>
        ) : (
          activeRows.map((row, i) => {
            const cgId = "id" in row ? (row as { id: string }).id : (row as { cgId: string }).cgId;
            return (
              <TokenRow
                key={cgId}
                symbol={row.symbol}
                name={row.name}
                logoURI={row.logoURI}
                cgId={cgId}
                contractAddress={row.contractAddress}
                priceUSD={row.priceUSD}
                change24h={row.change24h}
                sparkline={row.sparkline}
                isHeld={row.isHeld}
                heldUSD={row.heldUSD}
                onTap={() => onTokenTap(buildSelectedToken(row))}
                onRemove={
                  activeTab === "Watchlist"
                    ? () => removeWatch(cgId)
                    : undefined
                }
                isLast={i === activeRows.length - 1}
              />
            );
          })
        )}
      </div>

      {pickerOpen && <TokenPicker onClose={() => setPickerOpen(false)} />}
    </div>
  );
}
