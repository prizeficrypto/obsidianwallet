"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { ArrowUpDown, ChevronDown, AlertCircle, Check, X, Loader2 } from "lucide-react";
import { MiniKit } from "@worldcoin/minikit-js";
import { CHAINS } from "@/lib/chains";
import { formatAmount, parseAmount } from "@/lib/lifi";
import { WORLD_CHAIN_TOKENS } from "@/lib/tokens";
import { TOKEN_DESCRIPTIONS } from "@/lib/tokenDescriptions";
import { SEARCH_TOKENS } from "@/lib/searchTokens";
import {
  UNISWAP_SWAP_ROUTER,
  NATIVE_ETH,
  getBestQuote,
  applySlippage,
  feeLabel,
  buildApproveCalldata,
  buildTransferCalldata,
  buildSwapCalldata,
  buildSwapToEthCalldata,
  buildExactInputCalldata,
  resolveForUniswap,
} from "@/lib/uniswap";
import { useUniswapQuote, type UniswapQuoteResult } from "@/hooks/useUniswapQuote";
import { isKnownRouter } from "@/lib/security";
import ChainIcon, { TokenIcon } from "@/components/ChainIcon";
import {
  isUPToken,
  getUPSymbol,
  fetchUPQuote,
  submitUPOrder,
  USDC_E_ADDRESS,
  type UPQuote,
} from "@/lib/universal";
import { fetch0xQuote, toZxToken, type ZeroExQuote } from "@/lib/zeroex";

// ── Types ─────────────────────────────────────────────────────────────────────

type FlowStep = "form" | "quote-changed" | "up-review" | "success" | "error";

interface TokenState {
  address: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  name?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STABLECOIN_SYMBOLS = new Set(["USDC.e", "USDC", "USDT", "DAI", "EURC"]);

const WORLD_CHAIN = CHAINS.find((c) => c.id === "world-chain")!;
const WORLD_CHAIN_ID = 480;
const QUOTE_STALE_MS = 90_000;
const OUTPUT_DRIFT_THRESHOLD = 0.015; // 1.5%
const USDC_E_LOWER = USDC_E_ADDRESS.toLowerCase();

// ── Platform fee ──────────────────────────────────────────────────────────────
const PLATFORM_FEE_BPS = 50n;           // 0.5%
const PLATFORM_FEE_NUM = 0.005;         // for display math
const FEE_RECIPIENT = "0xc76a3025fadd524c9af1c3260a6703232e7911a3" as const;

function nativeToken(): TokenState {
  return {
    address: NATIVE_ETH,
    symbol: WORLD_CHAIN.symbol,
    decimals: WORLD_CHAIN.decimals,
  };
}

function usdcToken(): TokenState {
  const t = WORLD_CHAIN_TOKENS.find((t) => t.symbol === "USDC.e")!;
  return { address: t.address, symbol: t.symbol, decimals: t.decimals, logoURI: t.logoURI, name: t.name };
}

// All DEX-routable token addresses (lowercase) — anything NOT in UP_MAP + native ETH
function buildDexAddresses(): Set<string> {
  const set = new Set<string>();
  set.add(NATIVE_ETH.toLowerCase());
  WORLD_CHAIN_TOKENS.forEach((t) => {
    if (!isUPToken(t.address)) set.add(t.address.toLowerCase());
  });
  return set;
}
const DEX_ADDRESSES = buildDexAddresses();

// ── TokenBlock ────────────────────────────────────────────────────────────────

function TokenBlock({
  token,
  onTokenChange,
  amount,
  onAmountChange,
  isReadOnly,
  isLoading,
  label,
  heldAddresses,
  allowedAddresses,
  balance,
  onMax,
  isOpen,
  onOpenChange,
}: {
  token: TokenState;
  onTokenChange: (t: TokenState) => void;
  amount: string;
  onAmountChange?: (v: string) => void;
  isReadOnly?: boolean;
  isLoading?: boolean;
  label?: string;
  heldAddresses?: Set<string>;
  /** null = all tokens allowed; Set = only show these addresses */
  allowedAddresses?: Set<string> | null;
  balance?: number;
  onMax?: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isNative = token.address.toLowerCase() === NATIVE_ETH.toLowerCase();
  const displaySymbol = isNative ? WORLD_CHAIN.symbol : token.symbol;
  const displaySubtext = isNative ? "World Chain · Native" : (token.name ?? token.symbol);

  // Filter token list
  const showNative = !allowedAddresses || allowedAddresses.has(NATIVE_ETH.toLowerCase());
  const filteredTokens = allowedAddresses
    ? WORLD_CHAIN_TOKENS.filter((t) => allowedAddresses.has(t.address.toLowerCase()))
    : WORLD_CHAIN_TOKENS;

  const held = heldAddresses && heldAddresses.size > 0
    ? filteredTokens.filter((t) => heldAddresses.has(t.address.toLowerCase()))
    : [];
  const others = held.length > 0
    ? filteredTokens.filter((t) => !heldAddresses!.has(t.address.toLowerCase()))
    : filteredTokens;

  const pickerLabel = label === "You spend" ? "Spend" : "Receive";

  function TokenRow({ t }: { t: typeof WORLD_CHAIN_TOKENS[number] }) {
    const isSelected = !isNative && t.address.toLowerCase() === token.address.toLowerCase();
    return (
      <button
        key={t.address}
        onClick={() => {
          onTokenChange({ address: t.address, symbol: t.symbol, decimals: t.decimals, logoURI: t.logoURI, name: t.name });
          onOpenChange(false);
        }}
        className="w-full flex items-center gap-3 px-4 py-3 active:bg-white/5 transition-colors"
      >
        <TokenIcon logoURI={t.logoURI} symbol={t.symbol} size={32} />
        <div className="flex-1 text-left min-w-0">
          <p className="text-[14px] font-semibold text-white">{t.symbol}</p>
          <p className="text-[11px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
            {t.name}
          </p>
        </div>
        {isSelected && <Check size={13} className="text-purple-400 shrink-0" />}
      </button>
    );
  }

  const pickerPortal =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[9998]"
              style={{ background: "rgba(0,0,0,0.65)" }}
              onClick={() => onOpenChange(false)}
            />

            {/* Sheet */}
            <div
              className="fixed bottom-0 left-0 right-0 z-[9999] rounded-t-2xl overflow-hidden"
              style={{
                maxWidth: 430,
                margin: "0 auto",
                background: "#181818",
                border: "1px solid rgba(255,255,255,0.07)",
                borderBottom: "none",
                maxHeight: "72vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Sheet header */}
              <div
                className="flex items-center justify-between px-4 shrink-0"
                style={{
                  paddingTop: 16,
                  paddingBottom: 14,
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p className="text-[16px] font-bold text-white">{pickerLabel}</p>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center active:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <X size={15} style={{ color: "rgba(255,255,255,0.6)" }} />
                </button>
              </div>

              {/* Scrollable token list */}
              <div className="overflow-y-auto flex-1">
                {/* Native ETH */}
                {showNative && (
                  <button
                    onClick={() => { onTokenChange(nativeToken()); onOpenChange(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-white/5 transition-colors"
                  >
                    <ChainIcon chainId="world-chain" size={32} />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[14px] font-semibold text-white">{WORLD_CHAIN.symbol}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                        World Chain · Native
                      </p>
                    </div>
                    {isNative && <Check size={13} className="text-purple-400 shrink-0" />}
                  </button>
                )}

                {/* Held tokens section */}
                {held.length > 0 && (
                  <>
                    <div className="mx-4 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                    <p
                      className="px-4 pt-2.5 pb-1"
                      style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}
                    >
                      Your tokens
                    </p>
                    {held.map((t) => <TokenRow key={t.address} t={t} />)}
                  </>
                )}

                {/* All other tokens */}
                {others.length > 0 && (
                  <>
                    <div className="mx-4 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                    <p
                      className="px-4 pt-2.5 pb-1"
                      style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}
                    >
                      {held.length > 0 ? "All tokens" : "Tokens"}
                    </p>
                    {others.map((t) => <TokenRow key={t.address} t={t} />)}
                  </>
                )}

                {/* Safe scroll padding */}
                <div style={{ height: 24 }} />
              </div>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <>
      <div
        className="rounded-2xl"
        style={{
          background: isReadOnly
            ? "#0d0d0d"
            : "linear-gradient(160deg, #18181b 0%, #111113 100%)",
          border: isReadOnly
            ? "1px solid rgba(255,255,255,0.04)"
            : "1px solid rgba(255,255,255,0.10)",
          boxShadow: isReadOnly
            ? "none"
            : "0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        <div className="px-4 pt-3.5 pb-4">
          {/* Label + Balance row */}
          <div className="flex items-center justify-between mb-2.5">
            {label && (
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 400,
                  color: isReadOnly ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.28)",
                }}
              >
                {label}
              </p>
            )}
            {!isReadOnly && balance !== undefined && (
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                  {balance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {displaySymbol}
                </span>
                {onMax && (
                  <button
                    onClick={onMax}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg active:scale-95 transition-transform"
                    style={{ background: "rgba(124,111,232,0.18)", color: "rgba(155,140,255,0.95)" }}
                  >
                    Max
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Amount + Token picker row */}
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
                  <span style={{ fontSize: 15, fontWeight: 400, color: "rgba(255,255,255,0.2)" }}>
                    Getting quote…
                  </span>
                </div>
              ) : isReadOnly ? (
                <p
                  key={amount}
                  className="tabular-nums leading-none value-update"
                  style={{
                    fontSize: 34,
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: amount && amount !== "0" ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.1)",
                  }}
                >
                  {amount || "0"}
                </p>
              ) : (
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => onAmountChange?.(e.target.value)}
                  className="w-full bg-transparent text-[34px] font-bold text-white placeholder:text-white/[0.1] outline-none tabular-nums leading-none"
                  style={{ letterSpacing: "-0.025em" }}
                  min="0"
                />
              )}
            </div>

            <button
              onClick={() => onOpenChange(!isOpen)}
              className="flex items-center gap-2 py-1 active:opacity-70 transition-opacity shrink-0"
            >
              {isNative ? (
                <ChainIcon chainId="world-chain" size={24} />
              ) : (
                <TokenIcon logoURI={token.logoURI} symbol={token.symbol} size={24} />
              )}
              <span
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                {displaySymbol}
              </span>
              <ChevronDown
                size={9}
                strokeWidth={2.25}
                className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                style={{ color: "rgba(255,255,255,0.18)", marginLeft: -1 }}
              />
            </button>
          </div>

          <p
            className="mt-2"
            style={{
              fontSize: 11,
              fontWeight: 400,
              color: isReadOnly ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.22)",
            }}
          >
            {displaySubtext}
          </p>
        </div>
      </div>

      {pickerPortal}
    </>
  );
}

// ── RouteDetails ──────────────────────────────────────────────────────────────

function RouteDetails({
  result,
  toSymbol,
  quoteAgeMs,
  isFetching,
  feeDisplay,
}: {
  result: UniswapQuoteResult;
  toSymbol: string;
  quoteAgeMs: number;
  isFetching?: boolean;
  feeDisplay?: string;
}) {
  const isStale = quoteAgeMs > QUOTE_STALE_MS;
  const ageSecs = Math.floor(quoteAgeMs / 1000);
  const ageLabel = isFetching
    ? "updating…"
    : ageSecs < 5
    ? "just now"
    : isStale
    ? "refreshing…"
    : `${ageSecs}s`;

  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        background: "#0d0d0d",
        border: "1px solid rgba(255,255,255,0.06)",
        opacity: isFetching ? 0.7 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <div className="flex items-center justify-between mb-[9px]">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
            Uniswap V3
          </span>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 11 }}>·</span>
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            Best available rate
          </span>
        </div>
        <span
          className="text-[10px]"
          style={{
            color: isStale || isFetching ? "rgba(255,180,80,0.7)" : "rgba(255,255,255,0.2)",
          }}
        >
          {ageLabel}
        </span>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} className="mb-[9px]" />

      <div className="space-y-[7px]">
        <div className="flex justify-between">
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>
            Min. received
          </span>
          <span
            className="text-[11px] font-medium tabular-nums"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            {result.amountOutMinFormatted} {toSymbol}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>
            Slippage
          </span>
          <span className="text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.22)" }}>
            0.5%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>
            Platform fee
          </span>
          <span className="text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.22)" }}>
            0.5%{feeDisplay ? ` · ${feeDisplay}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── NoRouteSuggestions ────────────────────────────────────────────────────────

function NoRouteSuggestions({
  fromToken,
  isUPOnlyToken,
}: {
  fromToken: TokenState;
  isUPOnlyToken?: boolean;
}) {
  const isNativeFrom = fromToken.address.toLowerCase() === NATIVE_ETH.toLowerCase();

  if (isUPOnlyToken) {
    return (
      <div
        className="rounded-xl px-4 py-3.5"
        style={{ background: "#0e0e0e", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-[12px] font-semibold mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>
          Use World App&apos;s built-in wallet
        </p>
        <p className="text-[12px] leading-snug" style={{ color: "rgba(255,255,255,0.35)" }}>
          This is a Universal token. It can only be swapped via World App&apos;s built-in swap — open the Wallet tab in World App to sell it for USDC.e.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl px-4 py-3.5"
      style={{ background: "#0e0e0e", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <p className="text-[12px] font-semibold mb-2.5" style={{ color: "rgba(255,255,255,0.45)" }}>
        No route available
      </p>
      <div className="space-y-[7px]">
        {!isNativeFrom && (
          <div className="flex items-start gap-2">
            <span className="mt-[3px] text-[9px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>›</span>
            <p className="text-[12px] leading-snug" style={{ color: "rgba(255,255,255,0.35)" }}>
              Try using native {WORLD_CHAIN.symbol} or USDC.e as your starting token — deeper liquidity.
            </p>
          </div>
        )}
        <div className="flex items-start gap-2">
          <span className="mt-[3px] text-[9px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>›</span>
          <p className="text-[12px] leading-snug" style={{ color: "rgba(255,255,255,0.35)" }}>
            Try a smaller amount — some pools have limited liquidity.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── BridgeView ─────────────────────────────────────────────────────────────────

export default function BridgeView({
  address,
  heldAddresses,
  balanceMap,
}: {
  address: string | null;
  heldAddresses?: Set<string>;
  /** address.toLowerCase() → human-readable token balance */
  balanceMap?: Record<string, number>;
}) {
  const [fromToken, setFromToken] = useState<TokenState>(nativeToken());
  const [toToken, setToToken] = useState<TokenState>(usdcToken);
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<FlowStep>("form");
  const [txHash, setTxHash] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [quoteAgeMs, setQuoteAgeMs] = useState(0);
  const [pendingFreshQuote, setPendingFreshQuote] = useState<UniswapQuoteResult | null>(null);
  // Which picker is open — only one at a time
  const [openPicker, setOpenPicker] = useState<"from" | "to" | null>(null);
  const executionInFlight = useRef(false);

  // Universal Protocol state
  const [upQuote, setUpQuote] = useState<UPQuote | null>(null);
  const [upQuoteLoading, setUpQuoteLoading] = useState(false);
  const [upQuoteError, setUpQuoteError] = useState<string | null>(null);
  const [upRetryCount, setUpRetryCount] = useState(0);

  // 0x Protocol state
  const [zeroExQuote, setZeroExQuote] = useState<ZeroExQuote | null>(null);
  const [zeroExLoading, setZeroExLoading] = useState(false);

  // ── Token description helpers ─────────────────────────────────────────────

  // Map token contract address (lowercase) → CoinGecko ID
  const ADDRESS_TO_CG = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of SEARCH_TOKENS) {
      if (t.coingeckoId) m[t.contractAddress.toLowerCase()] = t.coingeckoId;
    }
    return m;
  }, []);

  const toTokenCgId = useMemo(
    () => ADDRESS_TO_CG[toToken.address.toLowerCase()] ?? null,
    [ADDRESS_TO_CG, toToken.address]
  );

  const toTokenDescription = useMemo(
    () => (toTokenCgId ? TOKEN_DESCRIPTIONS[toTokenCgId] ?? null : null),
    [toTokenCgId]
  );

  const isToTokenInvestable = useMemo(() => {
    const addr = toToken.address.toLowerCase();
    const sym = toToken.symbol;
    return (
      addr !== NATIVE_ETH.toLowerCase() &&
      !STABLECOIN_SYMBOLS.has(sym)
    );
  }, [toToken.address, toToken.symbol]);

  // ── Routing logic ─────────────────────────────────────────────────────────
  // Strategy: always try Uniswap V3 first (UP tokens may have V3 pools).
  // Fall back to Universal Protocol only when Uniswap finds no route and the
  // pair is UP-compatible (USDC.e ↔ UP token).

  // Whether the current pair can be routed via Universal Protocol
  const upOrderType = useMemo<"BUY" | "SELL" | null>(() => {
    const fromIsUSDC = fromToken.address.toLowerCase() === USDC_E_LOWER;
    if (fromIsUSDC && isUPToken(toToken.address)) return "BUY";
    if (isUPToken(fromToken.address) && toToken.address.toLowerCase() === USDC_E_LOWER) return "SELL";
    return null;
  }, [fromToken.address, toToken.address]);

  // True when at least one side is a UP token (affects picker restrictions & messaging)
  const hasUPToken = useMemo(
    () => isUPToken(fromToken.address) || isUPToken(toToken.address),
    [fromToken.address, toToken.address],
  );

  // ── Token filtering ───────────────────────────────────────────────────────
  // Restrict the "to" picker based on what routes exist from "from" token:
  //   - USDC.e as from → all tokens (Uniswap DEX + UP u-tokens)
  //   - UP token as from → only USDC.e
  //   - Any other DEX token as from → only DEX tokens (no u-tokens)
  const allowedToAddresses = useMemo<Set<string> | null>(() => {
    if (isUPToken(fromToken.address)) return new Set([USDC_E_LOWER]); // UP token → only USDC.e (UP SELL)
    return null; // all other from-tokens: show full list — Uniswap V3 handles routing
  }, [fromToken.address]);

  // Auto-reset toToken if it's no longer valid after fromToken changes
  useEffect(() => {
    if (allowedToAddresses && !allowedToAddresses.has(toToken.address.toLowerCase())) {
      setToToken(usdcToken());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromToken.address]);

  // ── Balance helpers ───────────────────────────────────────────────────────

  const fromBalance = useMemo(() => {
    if (!balanceMap) return undefined;
    return balanceMap[fromToken.address.toLowerCase()];
  }, [balanceMap, fromToken.address]);

  const handleMax = useCallback(() => {
    if (fromBalance !== undefined) {
      setAmount(fromBalance.toString());
    }
  }, [fromBalance]);

  // ── Fee helpers ───────────────────────────────────────────────────────────

  // 99.5% of what the user typed — this is what actually gets swapped
  const effectiveAmount = useMemo(() => {
    const n = parseFloat(amount);
    if (!amount || !Number.isFinite(n) || n <= 0) return "";
    return (n * (1 - PLATFORM_FEE_NUM)).toString();
  }, [amount]);

  // Human-readable fee for display: e.g. "0.5000 WLD"
  const platformFeeDisplay = useMemo(() => {
    const n = parseFloat(amount);
    if (!amount || !Number.isFinite(n) || n <= 0) return undefined;
    const fee = n * PLATFORM_FEE_NUM;
    const sym = fromToken.address.toLowerCase() === NATIVE_ETH.toLowerCase()
      ? WORLD_CHAIN.symbol
      : fromToken.symbol;
    if (fee < 0.000001) return `<0.000001 ${sym}`;
    if (fee < 0.001) return `${fee.toFixed(6)} ${sym}`;
    return `${fee.toFixed(4)} ${sym}`;
  }, [amount, fromToken]);

  // ── Uniswap quote ─────────────────────────────────────────────────────────

  const {
    data: quoteResult,
    isFetching: quoteFetching,
    dataUpdatedAt,
  } = useUniswapQuote({
    tokenIn: fromToken.address,
    tokenOut: toToken.address,
    amountIn: effectiveAmount,
    decimalsIn: fromToken.decimals,
    decimalsOut: toToken.decimals,
    fromAddress: address,
    enabled: true, // always try Uniswap V3 — UP tokens may have V3 pools too
  });

  // 0x is second fallback — only used when Uniswap has no route
  const use0xRouting = useMemo(() => {
    if (quoteFetching) return false;  // still waiting for Uniswap
    if (quoteResult) return false;    // Uniswap found a route
    return !!zeroExQuote;             // 0x has a route
  }, [quoteFetching, quoteResult, zeroExQuote]);

  // UP is last resort — only when neither Uniswap nor 0x found a route
  const useUPRouting = useMemo(() => {
    if (!upOrderType) return false;
    if (quoteFetching) return false;
    if (quoteResult) return false;    // Uniswap wins
    if (zeroExQuote) return false;    // 0x wins
    return true;                      // fall back to UP
  }, [upOrderType, quoteFetching, quoteResult, zeroExQuote]);

  useEffect(() => {
    if (!dataUpdatedAt) return;
    const update = () => setQuoteAgeMs(Date.now() - dataUpdatedAt);
    update();
    const id = setInterval(update, 5_000);
    return () => clearInterval(id);
  }, [dataUpdatedAt]);

  // ── Universal Protocol quote ──────────────────────────────────────────────

  // Fetch UP quote whenever the pair is UP-compatible (in parallel with Uniswap).
  // This way if Uniswap finds no pool the UP quote is already ready.
  useEffect(() => {
    if (!upOrderType || !address || !amount || Number(amount) <= 0) {
      setUpQuote(null);
      setUpQuoteError(null);
      return;
    }

    const upSymbol =
      upOrderType === "BUY" ? getUPSymbol(toToken.address) : getUPSymbol(fromToken.address);
    if (!upSymbol) return;

    setUpQuoteLoading(true);
    setUpQuoteError(null);

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const amtWei = parseAmount(effectiveAmount || "0", fromToken.decimals).toString();
        const req =
          upOrderType === "BUY"
            ? { type: "BUY" as const, token: upSymbol, pair_token: "USDC" as const, blockchain: "WORLD" as const, slippage_bips: 50, user_address: address, pair_token_amount: amtWei }
            : { type: "SELL" as const, token: upSymbol, pair_token: "USDC" as const, blockchain: "WORLD" as const, slippage_bips: 50, user_address: address, token_amount: amtWei };
        const q = await fetchUPQuote(req);
        if (!controller.signal.aborted) setUpQuote(q);
      } catch (e) {
        if (!controller.signal.aborted) {
          const msg = e instanceof Error ? e.message : "Quote unavailable";
          // "rate_limited" is the structured code our proxy returns on 429
          setUpQuoteError(msg.includes("rate_limited") ? "rate_limited" : msg);
        }
      } finally {
        if (!controller.signal.aborted) setUpQuoteLoading(false);
      }
    }, 1200);

    return () => {
      controller.abort();
      clearTimeout(timeout);
      setUpQuoteLoading(false);
    };
  }, [upOrderType, address, amount, effectiveAmount, fromToken, toToken, upRetryCount]);

  // ── 0x quote (parallel with Uniswap, used as fallback) ──────────────────────
  useEffect(() => {
    if (!amount || Number(amount) <= 0 || !address || !effectiveAmount) {
      setZeroExQuote(null);
      return;
    }
    // Skip if tokens are identical after resolution
    const sellAddr = toZxToken(fromToken.address);
    const buyAddr  = toZxToken(toToken.address);
    if (sellAddr.toLowerCase() === buyAddr.toLowerCase()) {
      setZeroExQuote(null);
      return;
    }

    setZeroExLoading(true);
    setZeroExQuote(null);

    const controller = new AbortController();
    // Small delay so Uniswap (which is synchronous on-chain) gets priority
    const timeout = setTimeout(async () => {
      try {
        const sellAmountWei = parseAmount(effectiveAmount, fromToken.decimals).toString();
        const q = await fetch0xQuote({
          sellToken: sellAddr,
          buyToken: buyAddr,
          sellAmount: sellAmountWei,
          takerAddress: address,
        });
        if (!controller.signal.aborted) setZeroExQuote(q);
      } catch {
        // Silently fall through — 0x failure just means we try UP next
      } finally {
        if (!controller.signal.aborted) setZeroExLoading(false);
      }
    }, 600);

    return () => {
      controller.abort();
      clearTimeout(timeout);
      setZeroExLoading(false);
    };
  }, [amount, effectiveAmount, fromToken, toToken, address]);

  const upToAmount = useMemo(() => {
    if (!upQuote) return "";
    const raw = upOrderType === "BUY" ? upQuote.token_amount : upQuote.pair_token_amount;
    const decimals = upOrderType === "BUY" ? toToken.decimals : 6;
    return formatAmount(raw, decimals);
  }, [upQuote, upOrderType, toToken.decimals]);

  // Output amount: Uniswap > 0x > UP
  const toAmount = quoteResult
    ? quoteResult.amountOutFormatted
    : use0xRouting && zeroExQuote
    ? formatAmount(zeroExQuote.buyAmount, toToken.decimals)
    : upToAmount;

  const handleFlip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount("");
  };

  const canExecute = use0xRouting
    ? !!zeroExQuote && !zeroExLoading && Number(amount) > 0 && !!address
    : useUPRouting
    ? !!upQuote && !upQuoteLoading && Number(amount) > 0 && !!address && !!upOrderType
    : !!quoteResult && !quoteFetching && Number(amount) > 0 && !!address;

  // ── submitWithQuote ───────────────────────────────────────────────────────

  const submitWithQuote = useCallback(
    async (result: UniswapQuoteResult) => {
      if (!address) return;

      const isFromNative = fromToken.address.toLowerCase() === NATIVE_ETH.toLowerCase();
      const isToNative = toToken.address.toLowerCase() === NATIVE_ETH.toLowerCase();
      const totalAmountWei = parseAmount(amount, fromToken.decimals);
      const feeAmountWei = totalAmountWei * PLATFORM_FEE_BPS / 10_000n;
      const amountInWei = totalAmountWei - feeAmountWei;
      const resolvedIn = resolveForUniswap(fromToken.address);
      const amountOutMin = result.amountOutMinimum;

      const transactions: Array<{ to: `0x${string}`; data: `0x${string}`; value: string }> = [];

      // ── Platform fee transfer ─────────────────────────────────────
      if (isFromNative) {
        // Send ETH fee directly to fee recipient
        transactions.push({
          to: FEE_RECIPIENT,
          data: "0x" as `0x${string}`,
          value: `0x${feeAmountWei.toString(16)}`,
        });
      } else {
        // Transfer ERC-20 fee to fee recipient
        transactions.push({
          to: fromToken.address as `0x${string}`,
          data: buildTransferCalldata(FEE_RECIPIENT, feeAmountWei),
          value: "0x0",
        });
      }

      if (!isFromNative) {
        transactions.push({
          to: fromToken.address as `0x${string}`,
          data: buildApproveCalldata(UNISWAP_SWAP_ROUTER, amountInWei),
          value: "0x0",
        });
      }

      if (isToNative) {
        transactions.push({
          to: UNISWAP_SWAP_ROUTER as `0x${string}`,
          data: buildSwapToEthCalldata({
            tokenIn: resolvedIn,
            fee: result.fee,
            amountIn: amountInWei,
            amountOutMinimum: amountOutMin,
            recipient: address,
          }),
          value: "0x0",
        });
      } else {
        const resolvedOut = resolveForUniswap(toToken.address);
        const swapData = result.raw.path
          ? buildExactInputCalldata({
              path: result.raw.path,
              recipient: address,
              amountIn: amountInWei,
              amountOutMinimum: amountOutMin,
            })
          : buildSwapCalldata({
              tokenIn: resolvedIn,
              tokenOut: resolvedOut,
              fee: result.fee,
              recipient: address,
              amountIn: amountInWei,
              amountOutMinimum: amountOutMin,
            });
        transactions.push({
          to: UNISWAP_SWAP_ROUTER as `0x${string}`,
          data: swapData,
          value: isFromNative ? `0x${amountInWei.toString(16)}` : "0x0",
        });
      }

      try {
        const res = await MiniKit.sendTransaction({
          chainId: WORLD_CHAIN_ID,
          transactions,
        });
        // MiniKit wraps the result: { commandPayload, finalPayload: { status, transaction_id } }
        // Fall back to checking top-level fields for forward-compat with older SDK versions.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = res as any;
        const payload = r?.finalPayload ?? r;
        const isSuccess =
          payload?.status === "success" || !!payload?.transaction_id || !!payload?.userOpHash;
        const hash =
          payload?.transaction_id ?? payload?.userOpHash ?? r?.transaction_id ?? r?.userOpHash ?? "";
        if (isSuccess) {
          setTxHash(hash);
          setStep("success");
        } else {
          setErrorMsg("Transaction was not confirmed. Please try again.");
          setStep("error");
        }
      } catch (e) {
        const code = (e as { code?: string })?.code ?? "";
        const msg =
          code === "user_rejected"
            ? "Swap cancelled."
            : code === "invalid_contract"
            ? "Swap not permitted yet. The Uniswap router must be whitelisted in the World Developer Portal under this app's permitted contracts."
            : code
            ? `Transaction failed: ${code}`
            : (e instanceof Error ? e.message : "Transaction failed");
        setErrorMsg(msg);
        setStep("error");
      } finally {
        setIsExecuting(false);
        executionInFlight.current = false;
        setPendingFreshQuote(null);
      }
    },
    [address, fromToken, toToken, amount],
  );

  // ── execute0x ─────────────────────────────────────────────────────────────

  const execute0x = useCallback(async () => {
    if (executionInFlight.current || !address) return;
    executionInFlight.current = true;
    setIsExecuting(true);

    try {
      const isFromNative = fromToken.address.toLowerCase() === NATIVE_ETH.toLowerCase();
      const totalAmountWei = parseAmount(amount, fromToken.decimals);
      const feeAmountWei   = (totalAmountWei * PLATFORM_FEE_BPS) / 10_000n;
      const amountInWei    = totalAmountWei - feeAmountWei;

      // Fetch a fresh quote right before signing
      const freshQuote = await fetch0xQuote({
        sellToken: toZxToken(fromToken.address),
        buyToken:  toZxToken(toToken.address),
        sellAmount: amountInWei.toString(),
        takerAddress: address,
      });

      const transactions: Array<{ to: `0x${string}`; data: `0x${string}`; value: string }> = [];

      // 1. Platform fee
      if (isFromNative) {
        transactions.push({
          to:    FEE_RECIPIENT,
          data:  "0x" as `0x${string}`,
          value: `0x${feeAmountWei.toString(16)}`,
        });
      } else {
        transactions.push({
          to:    fromToken.address as `0x${string}`,
          data:  buildTransferCalldata(FEE_RECIPIENT, feeAmountWei),
          value: "0x0",
        });
      }

      // 2. ERC-20 approval for the 0x allowanceTarget
      if (!isFromNative && freshQuote.allowanceTarget && freshQuote.allowanceTarget !== "0x0000000000000000000000000000000000000000") {
        transactions.push({
          to:    fromToken.address as `0x${string}`,
          data:  buildApproveCalldata(freshQuote.allowanceTarget, amountInWei),
          value: "0x0",
        });
      }

      // 3. 0x swap call
      const swapValue = isFromNative
        ? `0x${amountInWei.toString(16)}`
        : (freshQuote.value && freshQuote.value !== "0" ? `0x${BigInt(freshQuote.value).toString(16)}` : "0x0");

      transactions.push({
        to:    freshQuote.to as `0x${string}`,
        data:  freshQuote.data as `0x${string}`,
        value: swapValue,
      });

      const res = await MiniKit.sendTransaction({ chainId: WORLD_CHAIN_ID, transactions });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = res as any;
      const payload = r?.finalPayload ?? r;
      const isSuccess =
        payload?.status === "success" || !!payload?.transaction_id || !!payload?.userOpHash;
      const hash = payload?.transaction_id ?? payload?.userOpHash ?? "";

      if (isSuccess) {
        setTxHash(hash);
        setStep("success");
      } else {
        setErrorMsg("Transaction was not confirmed. Please try again.");
        setStep("error");
      }
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "";
      const msg =
        code === "user_rejected"
          ? "Swap cancelled."
          : code
          ? `Transaction failed: ${code}`
          : (e instanceof Error ? e.message : "Transaction failed");
      setErrorMsg(msg);
      setStep("error");
    } finally {
      setIsExecuting(false);
      executionInFlight.current = false;
    }
  }, [address, fromToken, toToken, amount]);

  // ── executeUniversal ──────────────────────────────────────────────────────

  const executeUniversal = useCallback(async () => {
    if (executionInFlight.current || !address || !upOrderType) return;
    executionInFlight.current = true;
    setIsExecuting(true);

    try {
      // Step 1: resolve UP symbol
      const upSymbol =
        upOrderType === "BUY" ? getUPSymbol(toToken.address) : getUPSymbol(fromToken.address);
      if (!upSymbol) throw new Error("Token not supported by Universal Protocol");

      // Step 2: fetch a fresh quote right before signing (fee-adjusted amount)
      const amtWei = parseAmount(effectiveAmount || "0", fromToken.decimals).toString();
      let freshQuote;
      try {
        freshQuote = await fetchUPQuote(
          upOrderType === "BUY"
            ? { type: "BUY", token: upSymbol, pair_token: "USDC", blockchain: "WORLD", slippage_bips: 50, user_address: address, pair_token_amount: amtWei }
            : { type: "SELL", token: upSymbol, pair_token: "USDC", blockchain: "WORLD", slippage_bips: 50, user_address: address, token_amount: amtWei }
        );
      } catch (e) {
        throw new Error(`Quote failed: ${e instanceof Error ? e.message : "unknown error"}`);
      }

      // Step 3: build EIP-712 typed data via universal-sdk
      const { generateTypedData } = await import("universal-sdk");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { typedData } = await generateTypedData(freshQuote as any);

      // Step 4: ask user to sign (no gas) via MiniKit
      let signResult;
      try {
        signResult = await MiniKit.signTypedData({
          ...typedData,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          types: typedData.types as any,
          chainId: 480,
        });
      } catch (e) {
        const code = (e as { code?: string })?.code ?? "";
        if (code === "user_rejected") throw new Error("user_rejected");
        throw new Error(`Signing failed: ${e instanceof Error ? e.message : code || "unknown error"}`);
      }

      // Step 5: submit signed order to relayer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signature = (signResult as any)?.data?.signature ?? (signResult as any)?.signature ?? "";
      if (!signature) throw new Error("No signature returned from World App — try again.");

      let transaction_hash: string;
      try {
        ({ transaction_hash } = await submitUPOrder(freshQuote, signature));
      } catch (e) {
        throw new Error(`Order submission failed: ${e instanceof Error ? e.message : "unknown error"}`);
      }

      setTxHash(transaction_hash ?? "");
      setStep("success");
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Swap failed";
      const msg = raw === "user_rejected" ? "Swap cancelled." : raw;
      setErrorMsg(msg);
      setStep("error");
    } finally {
      setIsExecuting(false);
      executionInFlight.current = false;
    }
  }, [address, upOrderType, fromToken, toToken, amount, effectiveAmount]);

  // ── execute ───────────────────────────────────────────────────────────────

  const execute = useCallback(async () => {
    if (executionInFlight.current || !address) return;

    executionInFlight.current = true;
    setIsExecuting(true);

    try {
      const totalAmountWei = parseAmount(amount, fromToken.decimals);
      const feeAmountWei = totalAmountWei * PLATFORM_FEE_BPS / 10_000n;
      const amountInWei = totalAmountWei - feeAmountWei;
      const freshQuote = await getBestQuote(fromToken.address, toToken.address, amountInWei);

      if (!freshQuote) {
        setErrorMsg("Could not get a fresh quote. Please try again.");
        setStep("error");
        setIsExecuting(false);
        executionInFlight.current = false;
        return;
      }

      if (!isKnownRouter(UNISWAP_SWAP_ROUTER)) {
        setErrorMsg("Router address not recognized. Aborting for safety.");
        setStep("error");
        setIsExecuting(false);
        executionInFlight.current = false;
        return;
      }

      const freshAmountOutMin = applySlippage(freshQuote.amountOut);
      const freshResult: UniswapQuoteResult = {
        raw: freshQuote,
        amountOut: freshQuote.amountOut,
        amountOutMinimum: freshAmountOutMin,
        amountOutFormatted: formatAmount(freshQuote.amountOut.toString(), toToken.decimals),
        amountOutMinFormatted: formatAmount(freshAmountOutMin.toString(), toToken.decimals),
        fee: freshQuote.fee,
        feeLabel: feeLabel(freshQuote.fee),
      };

      if (quoteResult) {
        const displayedOut = quoteResult.amountOut;
        const freshOut = freshQuote.amountOut;
        const worseByThreshold =
          displayedOut > 0n &&
          freshOut < displayedOut &&
          (displayedOut - freshOut) * 1000n > displayedOut * BigInt(Math.floor(OUTPUT_DRIFT_THRESHOLD * 1000));

        if (worseByThreshold) {
          setPendingFreshQuote(freshResult);
          setIsExecuting(false);
          setStep("quote-changed");
          return;
        }
      }

      await submitWithQuote(freshResult);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Transaction failed");
      setStep("error");
      setIsExecuting(false);
      executionInFlight.current = false;
    }
  }, [address, fromToken, toToken, amount, quoteResult, submitWithQuote]);

  const fromSymbol = fromToken.address.toLowerCase() === NATIVE_ETH.toLowerCase()
    ? WORLD_CHAIN.symbol
    : fromToken.symbol;
  const toSymbol = toToken.address.toLowerCase() === NATIVE_ETH.toLowerCase()
    ? WORLD_CHAIN.symbol
    : toToken.symbol;

  // ── Success screen ────────────────────────────────────────────────────────

  if (step === "success") {
    return (
      <div className="px-4 pt-8 pb-6">
        <div className="flex flex-col items-center mb-7">
          <div className="relative flex items-center justify-center mb-5">
            <div
              className="absolute rounded-full success-ring"
              style={{ width: 80, height: 80, background: "rgba(34,197,94,0.07)" }}
            />
            <div
              className="relative flex items-center justify-center rounded-full success-icon"
              style={{ width: 56, height: 56, background: "rgba(34,197,94,0.14)" }}
            >
              <Check size={22} strokeWidth={2.5} className="text-emerald-400" />
            </div>
          </div>

          <div className="text-center success-amount">
            <p
              className="text-white font-bold tabular-nums leading-none"
              style={{ fontSize: 36, letterSpacing: "-0.03em" }}
            >
              {amount} {fromSymbol}
            </p>
            <p className="mt-2" style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.38)" }}>
              purchase confirmed · submitted to network
            </p>
          </div>
        </div>

        <div className="space-y-2.5 success-details">
          <div
            className="rounded-xl px-4 py-3.5"
            style={{ background: "#0e0e0e", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex justify-between items-center">
              <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.35)" }}>
                You receive
              </span>
              <span className="tabular-nums font-semibold" style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                ~{toAmount || "—"} {toSymbol}
              </span>
            </div>
          </div>

          {txHash && (
            <a
              href={`${WORLD_CHAIN.explorerUrl}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 py-1 text-[12px]"
              style={{ fontWeight: 400, color: "rgba(255,255,255,0.22)" }}
            >
              View on World Chain explorer <span style={{ fontSize: 10 }}>↗</span>
            </a>
          )}

          <button
            onClick={() => { setStep("form"); setTxHash(""); setAmount(""); }}
            className="w-full py-[15px] rounded-2xl text-[14px] font-semibold active:scale-[0.98] transition-transform"
            style={{ background: "white", color: "#111111" }}
          >
            Swap again
          </button>
        </div>
      </div>
    );
  }

  // ── Quote-changed screen ──────────────────────────────────────────────────

  if (step === "quote-changed" && pendingFreshQuote) {
    const prevOut = quoteResult?.amountOutFormatted ?? "—";
    const newOut = pendingFreshQuote.amountOutFormatted;
    const newMin = pendingFreshQuote.amountOutMinFormatted;
    const pct =
      quoteResult
        ? (
            Number(
              ((quoteResult.amountOut - pendingFreshQuote.amountOut) * 10000n) /
                quoteResult.amountOut,
            ) / 100
          ).toFixed(2)
        : "—";

    return (
      <div className="px-4 py-6 space-y-3 enter">
        <div className="flex items-center gap-2.5 mb-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,180,0,0.1)" }}
          >
            <AlertCircle size={15} style={{ color: "rgba(255,180,0,0.85)" }} />
          </div>
          <div>
            <p className="text-[15px] font-bold text-white">Price updated</p>
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.38)" }}>
              Market moved while you were reviewing
            </p>
          </div>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.35)" }}>You reviewed</p>
            <p
              className="text-[14px] font-semibold tabular-nums"
              style={{ color: "rgba(255,255,255,0.45)", textDecoration: "line-through" }}
            >
              {prevOut} {toSymbol}
            </p>
          </div>
          <div
            className="flex items-center justify-between px-4 py-3.5"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.35)" }}>New output</p>
            <p className="text-[14px] font-bold tabular-nums text-white">
              {newOut} {toSymbol}
            </p>
          </div>
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,100,0,0.05)" }}
          >
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>Change</p>
            <p className="text-[11px] font-semibold" style={{ color: "rgba(255,130,0,0.85)" }}>
              −{pct}%
            </p>
          </div>
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>Worst case you receive</p>
            <p className="text-[11px] font-medium tabular-nums" style={{ color: "rgba(255,255,255,0.45)" }}>
              {newMin} {toSymbol}
            </p>
          </div>
        </div>

        <button
          onClick={() => { setIsExecuting(true); submitWithQuote(pendingFreshQuote); }}
          disabled={isExecuting}
          className="w-full py-[15px] rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:pointer-events-none"
          style={{ background: "white", color: "#111111" }}
        >
          {isExecuting && <Loader2 size={14} className="animate-spin" style={{ color: "#111111" }} />}
          Accept new price and confirm
        </button>
        <button
          onClick={() => {
            setPendingFreshQuote(null);
            executionInFlight.current = false;
            setStep("form");
          }}
          className="w-full py-3 rounded-xl text-[12px] font-medium"
          style={{ background: "transparent", color: "rgba(255,255,255,0.35)" }}
        >
          Cancel
        </button>
      </div>
    );
  }

  // ── Error screen ──────────────────────────────────────────────────────────

  if (step === "error") {
    const isUserCancelled = errorMsg === "Swap cancelled.";
    const isRouteError = errorMsg.includes("quote") || errorMsg.includes("route");
    const isSafetyAbort = errorMsg.includes("Aborting for safety");

    const title = isUserCancelled ? "Cancelled" : isSafetyAbort ? "Aborted" : "Transaction failed";
    const subtitle = isUserCancelled
      ? "You declined in World App"
      : isRouteError
      ? "Route unavailable"
      : isSafetyAbort
      ? "Security check failed"
      : "Something went wrong";

    return (
      <div className="px-4 pt-6 pb-6 enter">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: isUserCancelled ? "rgba(255,255,255,0.05)" : "rgba(239,68,68,0.1)" }}
          >
            <X
              size={15}
              style={{ color: isUserCancelled ? "rgba(255,255,255,0.38)" : "rgba(248,113,113,0.8)" }}
            />
          </div>
          <div>
            <p className="text-[15px] font-bold text-white leading-tight">{title}</p>
            <p className="text-[12px] mt-[2px]" style={{ color: "rgba(255,255,255,0.32)" }}>{subtitle}</p>
          </div>
        </div>

        <div
          className="rounded-xl px-4 py-3.5 mb-3"
          style={{ background: "#0e0e0e", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
            {errorMsg}
          </p>
          {isRouteError && (
            <p
              className="text-[11px] mt-2.5 pt-2.5"
              style={{ color: "rgba(255,255,255,0.22)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
            >
              Try a smaller amount or pair with a more liquid token like {WORLD_CHAIN.symbol} or USDC.e.
            </p>
          )}
        </div>

        <button
          onClick={() => { setStep("form"); setErrorMsg(""); }}
          className="w-full py-[14px] rounded-xl text-[13px] font-semibold active:scale-[0.98] transition-transform"
          style={{ background: "#161616", color: "rgba(255,255,255,0.6)" }}
        >
          {isUserCancelled ? "Go back" : "Try again"}
        </button>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  const hasAmount = Number(amount) > 0;

  // UP token involved but the pair isn't compatible with UP (e.g. WLD → uAVAX)
  // — Uniswap is still tried; this just explains the UP limitation
  const upUnsupportedPair = hasUPToken && !upOrderType && hasAmount;

  // Show loading while any active route is still fetching
  const isFetchingRoute = hasAmount && !isExecuting && (
    quoteFetching ||
    (!quoteResult && zeroExLoading) ||
    (!quoteResult && !zeroExQuote && useUPRouting && upQuoteLoading && !upQuote)
  );

  // No route when all three options are exhausted (including UP errors — if UP
  // can't quote a token it simply has no route, regardless of the reason)
  const isNoRoute = hasAmount && !isExecuting && !isFetchingRoute && (
    !quoteResult &&
    !zeroExQuote &&
    (!upOrderType || (!upQuoteLoading && !upQuote))
  );

  // UP-only token: Uniswap and 0x both have no route, and this is a UP pair.
  // The UP API is not accessible without a developer API key, so we direct
  // users to World App's built-in wallet instead.
  const isUPOnlyNoRoute = isNoRoute && !!upOrderType && !upUnsupportedPair;

  const isNeutral = isNoRoute || !hasAmount;

  const isToNativeToken = toToken.address.toLowerCase() === NATIVE_ETH.toLowerCase();
  const isFromNativeToken = fromToken.address.toLowerCase() === NATIVE_ETH.toLowerCase();
  const isToStable = STABLECOIN_SYMBOLS.has(toSymbol);
  const isFromStable = STABLECOIN_SYMBOLS.has(fromSymbol);

  const ctaLabel = isExecuting
    ? "Confirming…"
    : isFetchingRoute
    ? "Finding best price…"
    : isNoRoute
    ? upUnsupportedPair
      ? "Pair via USDC.e only"
      : "No route found"
    : canExecute
    ? isFromStable || isFromNativeToken
      ? `Buy ${toSymbol}`
      : isToStable || isToNativeToken
      ? `Sell ${fromSymbol}`
      : `Buy ${toSymbol}`
    : "Enter amount";

  return (
    <div className="px-4 pt-4 pb-6 space-y-2.5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-2">
        <p
          style={{
            fontSize: 20,
            fontWeight: 650,
            letterSpacing: "-0.025em",
            color: "rgba(255,255,255,0.95)",
          }}
        >
          Invest
        </p>
        <div
          className="flex items-center gap-1.5 rounded-xl"
          style={{
            background: "#161616",
            border: "1px solid rgba(255,255,255,0.07)",
            padding: "5px 10px",
          }}
        >
          <ChainIcon chainId="world-chain" size={13} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>
            World Chain
          </span>
        </div>
      </div>

      {/* ── You spend ────────────────────────────────────────────────────── */}
      <TokenBlock
        label="You spend"
        token={fromToken}
        onTokenChange={(t) => { setFromToken(t); setAmount(""); }}
        amount={amount}
        onAmountChange={setAmount}
        heldAddresses={heldAddresses}
        balance={fromBalance}
        onMax={handleMax}
        isOpen={openPicker === "from"}
        onOpenChange={(open) => setOpenPicker(open ? "from" : null)}
      />

      {/* ── Flip ────────────────────────────────────────────────────────── */}
      <div className="flex items-center -my-1.5 relative z-10">
        <div className="flex-1" style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
        <button
          onClick={handleFlip}
          className="mx-3 w-9 h-9 rounded-full flex items-center justify-center active:scale-90 active:bg-white/[0.06] transition-all duration-100"
          style={{
            background: "#161616",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
          }}
        >
          <ArrowUpDown size={14} strokeWidth={1.75} style={{ color: "rgba(255,255,255,0.5)" }} />
        </button>
        <div className="flex-1" style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
      </div>

      {/* ── You get ─────────────────────────────────────────────────────── */}
      <TokenBlock
        label="You get"
        token={toToken}
        onTokenChange={setToToken}
        amount={toAmount}
        isReadOnly
        isLoading={isFetchingRoute}
        heldAddresses={heldAddresses}
        allowedAddresses={allowedToAddresses}
        isOpen={openPicker === "to"}
        onOpenChange={(open) => setOpenPicker(open ? "to" : null)}
      />

      {/* ── What you're buying ──────────────────────────────────────────── */}
      {isToTokenInvestable && toTokenDescription && (
        <div
          className="rounded-xl px-4 py-3.5"
          style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p
            style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: 8 }}
          >
            What you&apos;re buying
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.75)", lineHeight: 1.4, marginBottom: 8 }}>
            {toTokenDescription.title}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {toTokenDescription.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.35)",
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
      )}

      {/* ── Route details ───────────────────────────────────────────────── */}
      {!useUPRouting && !use0xRouting && quoteResult && (
        <RouteDetails
          result={quoteResult}
          toSymbol={toSymbol}
          quoteAgeMs={quoteAgeMs}
          isFetching={quoteFetching}
          feeDisplay={platformFeeDisplay}
        />
      )}
      {use0xRouting && zeroExQuote && (
        <div
          className="rounded-xl px-3 py-2.5"
          style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between mb-[9px]">
            <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
              0x Protocol
            </span>
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
              Best available rate
            </span>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} className="mb-[9px]" />
          <div className="space-y-[7px]">
            <div className="flex justify-between">
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>Slippage</span>
              <span className="text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.22)" }}>0.5%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>Platform fee</span>
              <span className="text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.22)" }}>
                0.5%{platformFeeDisplay ? ` · ${platformFeeDisplay}` : ""}
              </span>
            </div>
          </div>
        </div>
      )}
      {useUPRouting && upQuote && (
        <div
          className="rounded-xl px-3 py-2.5"
          style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between mb-[9px]">
            <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
              Universal Protocol
            </span>
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
              No gas · Relayer settles
            </span>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} className="mb-[9px]" />
          <div className="space-y-[7px]">
            {upQuote.gas_fee_dollars > 0 && (
              <div className="flex justify-between">
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>Network fee</span>
                <span className="text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.22)" }}>
                  ~${upQuote.gas_fee_dollars.toFixed(4)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>Platform fee</span>
              <span className="text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.22)" }}>
                0.5%{platformFeeDisplay ? ` · ${platformFeeDisplay}` : ""}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── No route ────────────────────────────────────────────────────── */}
      {isNoRoute && !upUnsupportedPair && (
        <NoRouteSuggestions fromToken={fromToken} isUPOnlyToken={isUPOnlyNoRoute} />
      )}
      {isNoRoute && upUnsupportedPair && (
        <div
          className="rounded-xl px-4 py-3.5"
          style={{ background: "#0e0e0e", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-[12px] font-semibold mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            Swap via USDC.e
          </p>
          <p className="text-[12px] leading-snug" style={{ color: "rgba(255,255,255,0.35)" }}>
            To buy this token, swap to USDC.e first, then swap USDC.e for this token.
          </p>
        </div>
      )}


      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <div className="pt-1" />
      <button
        onClick={use0xRouting ? execute0x : useUPRouting ? executeUniversal : execute}
        disabled={!canExecute || isExecuting || isFetchingRoute}
        className="w-full py-[15px] rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98]"
        style={{
          background: isNeutral ? "#141414" : "white",
          color: isNeutral ? "rgba(255,255,255,0.28)" : "#111111",
          opacity: isExecuting ? 1 : isFetchingRoute ? 0.7 : 1,
          border: isNeutral ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
          letterSpacing: "-0.015em",
        }}
      >
        {(isExecuting || isFetchingRoute) && (
          <Loader2 size={14} className="animate-spin" style={{ opacity: 0.8, color: isNeutral ? "white" : "#111111" }} />
        )}
        {ctaLabel}
      </button>
    </div>
  );
}
