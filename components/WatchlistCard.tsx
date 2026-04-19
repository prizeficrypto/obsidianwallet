"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { useWatchlistStore, type WatchToken } from "@/store/watchlistStore";
import { useWatchlistPrices } from "@/hooks/useWatchlistPrices";
import { CURATED_WATCH_TOKENS } from "@/lib/watchlistTokens";
import ChainIcon, { TokenIcon } from "./ChainIcon";
import { formatPercent } from "@/lib/format";
import { useCurrency } from "@/hooks/useCurrency";
import type { SelectedToken } from "@/types/token";

// ── Token icon (reuses chain/token icon system) ────────────────────────────────

function WatchIcon({ token, size = 32 }: { token: WatchToken; size?: number }) {
  if (token.chainIconId) {
    return <ChainIcon chainId={token.chainIconId} size={size} />;
  }
  if (token.logoURI) {
    return <TokenIcon logoURI={token.logoURI} symbol={token.symbol} size={size} bg="#1a1a1a" />;
  }
  // Fallback: initials
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
      <span style={{ fontSize: size * 0.35, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>
        {token.symbol.slice(0, 2)}
      </span>
    </div>
  );
}

// ── Watched token row ──────────────────────────────────────────────────────────

function WatchRow({
  token,
  priceUSD,
  change24h,
  onRemove,
  onTap,
  formatPrice,
}: {
  token: WatchToken;
  priceUSD: number;
  change24h: number;
  onRemove: () => void;
  onTap?: () => void;
  formatPrice: (usd: number) => string;
}) {
  const isUp = change24h >= 0;
  const hasPct = Math.abs(change24h) >= 0.01;
  const changeColor = isUp ? "#4ade80" : "#f87171";

  return (
    <div className="flex items-center gap-3 px-4 py-[10px]">
      <button
        onClick={onTap}
        className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70 transition-opacity"
      >
        <WatchIcon token={token} size={34} />

        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)", letterSpacing: "-0.01em" }}>
            {token.symbol}
          </p>
          <p style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.28)", marginTop: 2 }}>
            {token.name}
          </p>
        </div>

        <div className="text-right" style={{ minWidth: 72 }}>
          <p className="tabular-nums" style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>
            {priceUSD > 0 ? formatPrice(priceUSD) : "—"}
          </p>
          <p
            className="tabular-nums"
            style={{
              fontSize: 11,
              fontWeight: 400,
              color: hasPct ? changeColor : "rgba(255,255,255,0.18)",
              marginTop: 2,
            }}
          >
            {hasPct ? formatPercent(change24h) : "—"}
          </p>
        </div>
      </button>

      <button
        onClick={onRemove}
        style={{ color: "rgba(255,255,255,0.18)", padding: "6px", margin: "-6px -2px -6px 0" }}
        className="active:opacity-50 transition-opacity flex-shrink-0"
        aria-label={`Remove ${token.symbol} from watchlist`}
      >
        <X size={13} strokeWidth={2} />
      </button>
    </div>
  );
}

// ── Divider ────────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div
      className="mr-4"
      style={{ height: 1, marginLeft: 66, background: "rgba(255,255,255,0.04)" }}
    />
  );
}

// ── Token picker sheet ─────────────────────────────────────────────────────────

function TokenPicker({ onClose }: { onClose: () => void }) {
  const { tokens, add, remove, has } = useWatchlistStore();

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 9998,
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          display: "flex",
          justifyContent: "center",
        }}
      >
      <div
        className="enter"
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
        {/* Handle + header — sticky inside the scroll container */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            background: "#111111",
            padding: "12px 20px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              width: 32,
              height: 4,
              borderRadius: 2,
              background: "rgba(255,255,255,0.1)",
              margin: "0 auto 16px",
            }}
          />
          <div className="flex items-center justify-between">
            <p style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.88)", letterSpacing: "-0.01em" }}>
              Add to Watchlist
            </p>
            <button
              onClick={onClose}
              style={{ color: "rgba(255,255,255,0.28)", padding: "4px", margin: "-4px" }}
              className="active:opacity-50 transition-opacity"
            >
              <X size={17} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Token list */}
        <div style={{ paddingTop: 4, paddingBottom: "env(safe-area-inset-bottom, 24px)" }}>
          {CURATED_WATCH_TOKENS.map((token, i) => {
            const watching = has(token.id);
            const displayName = token.name.replace(" (Universal)", "");
            return (
              <div key={token.id}>
                <button
                  onClick={() => watching ? remove(token.id) : add(token)}
                  className="w-full flex items-center gap-3 px-5 active:bg-white/[0.03] transition-colors text-left"
                  style={{ paddingTop: 12, paddingBottom: 12 }}
                >
                  <WatchIcon token={token} size={32} />

                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                      {token.symbol}
                    </p>
                    <p style={{ fontSize: 11.5, fontWeight: 400, color: "rgba(255,255,255,0.3)", marginTop: 2, lineHeight: 1.2 }}>
                      {displayName}
                    </p>
                  </div>

                  {/* Toggle */}
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      border: watching ? "none" : "1.5px solid rgba(255,255,255,0.18)",
                      background: watching ? "#6C5CE7" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "background 0.12s ease",
                    }}
                  >
                    {watching && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </button>

                {/* Row separator — inset to align with text, not icon */}
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

// ── WatchlistCard ──────────────────────────────────────────────────────────────

export default function WatchlistCard({ onTokenTap }: { onTokenTap?: (token: SelectedToken) => void }) {
  const { tokens, remove } = useWatchlistStore();
  const prices = useWatchlistPrices();
  const [pickerOpen, setPickerOpen] = useState(false);
  const { format, rate, symbol } = useCurrency();

  function fmtWatchPrice(usd: number): string {
    if (usd === 0) return "—";
    const n = usd * rate;
    if (n >= 1000) return format(usd);
    if (n >= 1)    return `${symbol}${n.toFixed(2)}`;
    if (n >= 0.01) return `${symbol}${n.toFixed(4)}`;
    return `${symbol}${n.toFixed(6)}`;
  }

  // Don't render the card if the watchlist is empty and picker is closed
  // (avoids a blank section on first open)
  if (tokens.length === 0 && !pickerOpen) {
    return (
      <div className="mt-4 mx-4">
        <div className="flex items-center justify-between mb-2">
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.07em",
              color: "rgba(255,255,255,0.22)",
              textTransform: "uppercase",
            }}
          >
            Watching
          </p>
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1 active:opacity-60 transition-opacity"
            style={{ color: "rgba(255,255,255,0.28)", padding: "2px 0" }}
          >
            <Plus size={12} strokeWidth={2} />
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "-0.01em" }}>Add</span>
          </button>
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          className="w-full active:opacity-70 transition-opacity"
          style={{
            borderRadius: 12,
            border: "1px dashed rgba(255,255,255,0.08)",
            padding: "14px 16px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", letterSpacing: "-0.01em" }}>
            Track tokens before you buy
          </p>
        </button>
        {pickerOpen && <TokenPicker onClose={() => setPickerOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="mt-4">
      {/* Section header */}
      <div className="flex items-center justify-between mx-4 mb-1">
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.07em",
            color: "rgba(255,255,255,0.22)",
            textTransform: "uppercase",
          }}
        >
          Watching
        </p>
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-1 active:opacity-60 transition-opacity"
          style={{ color: "rgba(255,255,255,0.28)", padding: "2px 0" }}
        >
          <Plus size={12} strokeWidth={2} />
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "-0.01em" }}>Add</span>
        </button>
      </div>

      {/* Token rows */}
      {tokens.map((token, i) => {
        const price = prices[token.id];
        return (
          <div key={token.id}>
            <WatchRow
              token={token}
              priceUSD={price?.priceUSD ?? 0}
              change24h={price?.change24h ?? 0}
              onRemove={() => remove(token.id)}
              formatPrice={fmtWatchPrice}
              onTap={() => onTokenTap?.({
                symbol: token.symbol,
                coingeckoId: token.id,
                logoURI: token.logoURI,
                chainIconId: token.chainIconId,
                network: "World Chain",
                balance: 0,
                balanceUSD: 0,
                priceChange24h: price?.change24h ?? 0,
                explorerUrl: "https://worldscan.org",
              })}
            />
            {i < tokens.length - 1 && <Divider />}
          </div>
        );
      })}

      {pickerOpen && <TokenPicker onClose={() => setPickerOpen(false)} />}
    </div>
  );
}
