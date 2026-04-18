"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, ArrowLeft } from "lucide-react";
import { useWatchlistStore } from "@/store/watchlistStore";
import { SEARCH_TOKENS, SEARCH_TOKEN_CG_IDS } from "@/lib/searchTokens";
import ChainIcon, { TokenIcon } from "@/components/ChainIcon";
import { formatUSD, formatPercent } from "@/lib/format";
import type { ChainBalance } from "@/hooks/useChainBalances";
import type { WldBalance } from "@/hooks/useWldBalance";
import type { PriceMap } from "@/lib/prices";
import type { SelectedToken } from "@/types/token";

// ── Formatters ─────────────────────────────────────────────────────────────────

function fmtPrice(n: number): string {
  if (n <= 0) return "—";
  if (n >= 1000) return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
}

function fmtBal(value: number, symbol: string): string {
  if (value === 0) return `0 ${symbol}`;
  if (value < 0.001) return `<0.001 ${symbol}`;
  if (value < 1) return `${value.toFixed(3)} ${symbol}`;
  if (value < 10_000) return `${value.toFixed(2)} ${symbol}`;
  return `${Math.round(value).toLocaleString()} ${symbol}`;
}

// ── Token icon ─────────────────────────────────────────────────────────────────

function TIcon({
  chainIconId,
  logoURI,
  symbol,
  size = 36,
}: {
  chainIconId?: string;
  logoURI?: string;
  symbol: string;
  size?: number;
}) {
  if (chainIconId) return <ChainIcon chainId={chainIconId} size={size} />;
  if (logoURI) return <TokenIcon logoURI={logoURI} symbol={symbol} size={size} bg="#1a1a1a" />;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#1a1a1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: size * 0.32,
          fontWeight: 700,
          color: "rgba(255,255,255,0.35)",
        }}
      >
        {symbol.slice(0, 2)}
      </span>
    </div>
  );
}

// ── Result types ───────────────────────────────────────────────────────────────

interface BaseResult {
  id: string;
  symbol: string;
  name: string;
  chainIconId?: string;
  logoURI?: string;
  priceUSD: number;
  change24h: number;
  selectedToken: SelectedToken;
}

interface HoldingResult extends BaseResult {
  kind: "holding";
  balance: number;
  balanceUSD: number;
}

interface DiscoverResult extends BaseResult {
  kind: "discover";
}

type SearchResult = HoldingResult | DiscoverResult;

// ── Result row ─────────────────────────────────────────────────────────────────

function ResultRow({
  result,
  onTap,
}: {
  result: SearchResult;
  onTap: () => void;
}) {
  const isHolding = result.kind === "holding";
  const isUp = result.change24h >= 0;
  const changeColor = isUp ? "#4ade80" : "#f87171";
  const hasPct = Math.abs(result.change24h) >= 0.01;

  const displayValue = isHolding
    ? (result as HoldingResult).balanceUSD > 0
      ? formatUSD((result as HoldingResult).balanceUSD)
      : "—"
    : fmtPrice(result.priceUSD);

  const subValue = isHolding
    ? fmtBal((result as HoldingResult).balance, result.symbol)
    : result.name;

  return (
    <button
      onClick={onTap}
      className="w-full flex items-center gap-3 px-4 py-[10px] active:bg-white/[0.03] transition-colors text-left"
    >
      <div className="flex-shrink-0">
        <TIcon
          chainIconId={result.chainIconId}
          logoURI={result.logoURI}
          symbol={result.symbol}
          size={36}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "rgba(255,255,255,0.88)",
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
          }}
        >
          {result.symbol}
        </p>
        <p
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.28)",
            marginTop: 3,
            lineHeight: 1,
          }}
        >
          {subValue}
        </p>
      </div>

      <div className="text-right flex-shrink-0" style={{ minWidth: 64 }}>
        <p
          className="tabular-nums"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "rgba(255,255,255,0.88)",
            lineHeight: 1.2,
          }}
        >
          {displayValue}
        </p>
        {hasPct && result.priceUSD > 0 && (
          <p
            className="tabular-nums"
            style={{
              fontSize: 11,
              fontWeight: 400,
              color: changeColor,
              marginTop: 3,
              lineHeight: 1,
            }}
          >
            {formatPercent(result.change24h)}
          </p>
        )}
      </div>
    </button>
  );
}

function Divider() {
  return (
    <div
      className="mr-4"
      style={{ height: 1, marginLeft: 64, background: "rgba(255,255,255,0.04)" }}
    />
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p
      className="px-4 pt-4 pb-1.5"
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.07em",
        color: "rgba(255,255,255,0.22)",
        textTransform: "uppercase",
      }}
    >
      {label}
    </p>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface SearchModalProps {
  balances: ChainBalance[] | undefined;
  wldBalance: WldBalance | undefined;
  prices: PriceMap | undefined;
  wldPriceChange: number | undefined;
  onTokenTap: (token: SelectedToken) => void;
  onClose: () => void;
}

export default function SearchModal({
  balances,
  wldBalance,
  prices,
  wldPriceChange,
  onTokenTap,
  onClose,
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"All" | "Holdings" | "World Chain">("All");
  const inputRef = useRef<HTMLInputElement>(null);
  const { has: isWatching } = useWatchlistStore();

  // Auto-focus input
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  // Fetch live prices for all World Chain search tokens in one call
  const searchIds = SEARCH_TOKEN_CG_IDS.join(",");
  const { data: curatedPriceMap } = useQuery({
    queryKey: ["search-prices", searchIds],
    queryFn: async () => {
      const res = await fetch(`/api/prices?ids=${searchIds}`);
      if (!res.ok) return {};
      return res.json() as Promise<
        Record<string, { usd: number; usd_24h_change: number }>
      >;
    },
    staleTime: 60_000,
    retry: 1,
  });

  // IDs of tokens the user holds — used to deduplicate discover results
  const heldIds = useMemo(() => {
    const ids = new Set<string>();
    if (wldBalance) ids.add("worldcoin-wld");
    for (const b of balances ?? []) {
      if (b.chain.coingeckoId) ids.add(b.chain.coingeckoId);
    }
    return ids;
  }, [balances, wldBalance]);

  // Holdings — built from live balance data
  const holdings: HoldingResult[] = useMemo(() => {
    const results: HoldingResult[] = [];

    if (wldBalance) {
      const balance = parseFloat(wldBalance.formatted);
      const pd = curatedPriceMap?.["worldcoin-wld"];
      results.push({
        kind: "holding",
        id: "worldcoin-wld",
        symbol: "WLD",
        name: "Worldcoin",
        logoURI: wldBalance.logoURI,
        balance,
        balanceUSD: wldBalance.usd,
        priceUSD: pd?.usd ?? prices?.["worldcoin-wld"]?.usd ?? 0,
        change24h: wldPriceChange ?? pd?.usd_24h_change ?? 0,
        selectedToken: {
          symbol: "WLD",
          coingeckoId: "worldcoin-wld",
          logoURI: wldBalance.logoURI,
          network: "World Chain",
          balance,
          balanceUSD: wldBalance.usd,
          priceChange24h: wldPriceChange ?? 0,
          explorerUrl: "https://worldscan.org",
          contractAddress: "0x2cFc85d8E48F8EAB294be644d9E25C3030863003",
        },
      });
    }

    for (const b of balances ?? []) {
      const pd = curatedPriceMap?.[b.chain.coingeckoId ?? ""] ??
                 prices?.[b.chain.coingeckoId ?? ""];
      results.push({
        kind: "holding",
        id: b.chain.coingeckoId ?? b.chain.id,
        symbol: b.chain.symbol,
        name: b.chain.name,
        chainIconId: b.chain.id,
        balance: b.nativeBalance,
        balanceUSD: b.usdValue,
        priceUSD: (pd as { usd?: number } | undefined)?.usd ?? 0,
        change24h: b.priceChange24h,
        selectedToken: {
          symbol: b.chain.symbol,
          coingeckoId: b.chain.coingeckoId,
          chainIconId: b.chain.id,
          network: b.chain.name,
          balance: b.nativeBalance,
          balanceUSD: b.usdValue,
          priceChange24h: b.priceChange24h,
          explorerUrl: b.chain.explorerUrl,
        },
      });
    }

    return results.sort((a, b) => b.balanceUSD - a.balanceUSD);
  }, [balances, wldBalance, prices, curatedPriceMap, wldPriceChange]);

  // Discover tokens — World Chain swappable tokens minus what the user already holds
  const discoverTokens: DiscoverResult[] = useMemo(() => {
    return SEARCH_TOKENS.filter((t) => {
      // Exclude if user already holds it (by CoinGecko ID)
      if (t.coingeckoId && heldIds.has(t.coingeckoId)) return false;
      return true;
    }).map((t) => {
      const pd = t.coingeckoId ? curatedPriceMap?.[t.coingeckoId] : undefined;
      return {
        kind: "discover" as const,
        id: t.id,
        symbol: t.symbol,
        name: t.name,
        logoURI: t.logoURI || undefined,
        priceUSD: pd?.usd ?? 0,
        change24h: pd?.usd_24h_change ?? 0,
        selectedToken: {
          symbol: t.symbol,
          coingeckoId: t.coingeckoId ?? "",
          logoURI: t.logoURI || undefined,
          network: "World Chain",
          balance: 0,
          balanceUSD: 0,
          priceChange24h: pd?.usd_24h_change ?? 0,
          explorerUrl: "https://worldscan.org",
          contractAddress: t.contractAddress,
        },
      };
    });
  }, [heldIds, curatedPriceMap]);

  // Filter + rank results by query
  const q = query.toLowerCase().trim();
  const { filteredHoldings, filteredDiscover } = useMemo(() => {
    if (!q) return { filteredHoldings: holdings, filteredDiscover: discoverTokens };

    function matches(r: SearchResult) {
      return (
        r.symbol.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q)
      );
    }

    function rank(r: SearchResult): number {
      if (r.symbol.toLowerCase().startsWith(q)) return 0;
      if (r.name.toLowerCase().startsWith(q)) return 1;
      return 2;
    }

    const fh = holdings.filter(matches).sort((a, b) => rank(a) - rank(b));
    const fd = discoverTokens.filter(matches).sort((a, b) => rank(a) - rank(b));
    return { filteredHoldings: fh, filteredDiscover: fd };
  }, [q, holdings, discoverTokens]);

  // Apply tab filter on top of query filter
  const visibleHoldings = filterTab === "World Chain" ? [] : filteredHoldings;
  const visibleDiscover = filterTab === "Holdings" ? [] : filteredDiscover;
  const hasResults = visibleHoldings.length > 0 || visibleDiscover.length > 0;
  const isFiltering = q.length > 0;

  function handleTap(result: SearchResult) {
    onTokenTap(result.selectedToken);
    onClose();
  }

  function renderRows(results: SearchResult[]) {
    return results.map((r, i) => (
      <div key={r.id}>
        <ResultRow result={r} onTap={() => handleTap(r)} />
        {i < results.length - 1 && <Divider />}
      </div>
    ));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: "#0a0a0a",
        maxWidth: 430,
        margin: "0 auto",
        animation: "fadeSlideUp 0.18s cubic-bezier(0.22, 1, 0.36, 1) both",
      }}
    >
      {/* ── Search bar ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 flex-shrink-0"
        style={{ height: 56 }}
      >
        <button
          onClick={onClose}
          className="flex-shrink-0 active:opacity-50 transition-opacity"
          style={{ color: "rgba(255,255,255,0.4)" }}
          aria-label="Close search"
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </button>

        <div
          className="flex-1 flex items-center gap-2 px-3"
          style={{
            height: 36,
            borderRadius: 10,
            background: "rgba(255,255,255,0.07)",
          }}
        >
          <Search
            size={13}
            strokeWidth={1.75}
            style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tokens"
            className="flex-1 bg-transparent outline-none text-white placeholder:text-white/[0.28]"
            style={{ fontSize: 14, fontWeight: 400, letterSpacing: "-0.01em" }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          {query.length > 0 && (
            <button
              onClick={() => setQuery("")}
              className="flex-shrink-0 active:opacity-50 transition-opacity"
              style={{ color: "rgba(255,255,255,0.3)" }}
              aria-label="Clear search"
            >
              <X size={13} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* ── Filter chips ─────────────────────────────────────────────────── */}
      <div
        className="flex gap-2 px-4 pb-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        {(["All", "Holdings", "World Chain"] as const).map((tab) => {
          const active = filterTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className="transition-all active:scale-95"
              style={{
                padding: "5px 12px",
                borderRadius: 20,
                background: active ? "#1e1e1e" : "transparent",
                border: `1px solid ${active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.08)"}`,
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                color: active ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.35)",
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* ── Results ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isFiltering || filterTab !== "All" ? (
          hasResults ? (
            <>
              {renderRows(visibleHoldings)}
              {visibleHoldings.length > 0 && visibleDiscover.length > 0 && (
                <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "2px 0" }} />
              )}
              {renderRows(visibleDiscover)}
            </>
          ) : (
            <div className="flex flex-col items-center px-6" style={{ paddingTop: 64 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.28)", letterSpacing: "-0.01em", marginBottom: 28 }}>
                {q ? `Nothing found for "${query}"` : "Nothing here"}
              </p>
              {q && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(255,255,255,0.14)", textTransform: "uppercase", marginBottom: 12 }}>
                    Try
                  </p>
                  <div className="flex gap-2">
                    {["uSOL", "uXRP", "uBNB"].map((sym) => (
                      <button
                        key={sym}
                        onClick={() => setQuery(sym)}
                        className="px-3.5 py-2 rounded-xl active:opacity-60 transition-opacity"
                        style={{ background: "rgba(255,255,255,0.05)", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "-0.01em" }}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        ) : (
          // Default "All" tab — show both sections
          <>
            {holdings.length > 0 && (
              <>
                <SectionLabel label="Holdings" />
                {renderRows(holdings)}
              </>
            )}
            {discoverTokens.length > 0 && (
              <>
                <SectionLabel label="World Chain" />
                {renderRows(discoverTokens)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
