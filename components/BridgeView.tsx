"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowUpDown, ChevronDown, AlertCircle, Check, X, Loader2 } from "lucide-react";
import { MiniKit } from "@worldcoin/minikit-js";
import { CHAINS } from "@/lib/chains";
import { formatAmount, parseAmount } from "@/lib/lifi";
import { WORLD_CHAIN_TOKENS } from "@/lib/tokens";
import {
  UNISWAP_SWAP_ROUTER,
  WETH9,
  NATIVE_ETH,
  getBestQuote,
  applySlippage,
  feeLabel,
  buildApproveCalldata,
  buildSwapCalldata,
  buildSwapToEthCalldata,
  resolveForUniswap,
  type UniswapQuote,
} from "@/lib/uniswap";
import { useUniswapQuote, type UniswapQuoteResult } from "@/hooks/useUniswapQuote";
import { isKnownRouter } from "@/lib/security";
import ChainIcon, { TokenIcon } from "@/components/ChainIcon";

// ── Types ─────────────────────────────────────────────────────────────────────

type FlowStep = "form" | "quote-changed" | "success" | "error";

interface TokenState {
  address: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  name?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WORLD_CHAIN = CHAINS.find((c) => c.id === "world-chain")!;
const WORLD_CHAIN_ID = 480;
const QUOTE_STALE_MS = 90_000;
const OUTPUT_DRIFT_THRESHOLD = 0.015; // 1.5%

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
}: {
  token: TokenState;
  onTokenChange: (t: TokenState) => void;
  amount: string;
  onAmountChange?: (v: string) => void;
  isReadOnly?: boolean;
  isLoading?: boolean;
  label?: string;
  heldAddresses?: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const isNative = token.address.toLowerCase() === NATIVE_ETH.toLowerCase();
  const displaySymbol = isNative ? WORLD_CHAIN.symbol : token.symbol;
  const displaySubtext = isNative ? "World Chain · Native" : (token.name ?? token.symbol);

  return (
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
        {label && (
          <p
            className="mb-2.5"
            style={{
              fontSize: 11,
              fontWeight: 400,
              color: isReadOnly ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.28)",
            }}
          >
            {label}
          </p>
        )}

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

          <div className="relative shrink-0">
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 py-1 active:opacity-70 transition-opacity"
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
                className={`transition-transform ${open ? "rotate-180" : ""}`}
                style={{ color: "rgba(255,255,255,0.18)", marginLeft: -1 }}
              />
            </button>

            {open && (
              <div
                className="absolute right-0 z-30 rounded-2xl overflow-y-auto shadow-2xl dropdown-enter"
                style={{
                  top: "calc(100% + 6px)",
                  width: 240,
                  maxHeight: 360,
                  background: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {/* Native ETH */}
                <button
                  onClick={() => { onTokenChange(nativeToken()); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 active:bg-white/5 transition-colors"
                >
                  <ChainIcon chainId="world-chain" size={28} />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[13px] font-semibold text-white">{WORLD_CHAIN.symbol}</p>
                    <p className="text-[10px] mt-[2px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                      World Chain · Native
                    </p>
                  </div>
                  {isNative && <Check size={12} className="text-purple-400 shrink-0" />}
                </button>

                {/* Tokens — held first, then all others */}
                {(() => {
                  const held = heldAddresses && heldAddresses.size > 0
                    ? WORLD_CHAIN_TOKENS.filter(t => heldAddresses.has(t.address.toLowerCase()))
                    : [];
                  const others = held.length > 0
                    ? WORLD_CHAIN_TOKENS.filter(t => !heldAddresses!.has(t.address.toLowerCase()))
                    : WORLD_CHAIN_TOKENS;

                  function TokenRow({ t }: { t: typeof WORLD_CHAIN_TOKENS[number] }) {
                    const isSelected = !isNative && t.address.toLowerCase() === token.address.toLowerCase();
                    return (
                      <button
                        key={t.address}
                        onClick={() => {
                          onTokenChange({ address: t.address, symbol: t.symbol, decimals: t.decimals, logoURI: t.logoURI, name: t.name });
                          setOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-white/5 transition-colors"
                      >
                        <TokenIcon logoURI={t.logoURI} symbol={t.symbol} size={28} />
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-[13px] font-semibold text-white">{t.symbol}</p>
                          <p className="text-[10px] truncate mt-[2px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                            {t.name}
                          </p>
                        </div>
                        {isSelected && <Check size={12} className="text-purple-400 shrink-0" />}
                      </button>
                    );
                  }

                  return (
                    <>
                      <div className="mx-4 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                      {held.length > 0 && (
                        <>
                          <p className="px-4 pt-2 pb-1" style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>
                            Your tokens
                          </p>
                          {held.map(t => <TokenRow key={t.address} t={t} />)}
                          <div className="mx-4 h-px my-1" style={{ background: "rgba(255,255,255,0.05)" }} />
                          <p className="px-4 pt-1 pb-1" style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>
                            All tokens
                          </p>
                        </>
                      )}
                      {!held.length && (
                        <p className="px-4 pt-2 pb-1" style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>
                          Tokens
                        </p>
                      )}
                      {others.map(t => <TokenRow key={t.address} t={t} />)}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
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
  );
}

// ── RouteDetails ──────────────────────────────────────────────────────────────

function RouteDetails({
  result,
  toSymbol,
  quoteAgeMs,
  isFetching,
}: {
  result: UniswapQuoteResult;
  toSymbol: string;
  quoteAgeMs: number;
  isFetching?: boolean;
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
            {result.feeLabel} pool
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
      </div>
    </div>
  );
}

// ── NoRouteSuggestions ────────────────────────────────────────────────────────

function NoRouteSuggestions({ fromToken }: { fromToken: TokenState }) {
  const isNativeFrom = fromToken.address.toLowerCase() === NATIVE_ETH.toLowerCase();
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
}: {
  address: string | null;
  heldAddresses?: Set<string>;
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
  const executionInFlight = useRef(false);

  const {
    data: quoteResult,
    isFetching: quoteFetching,
    dataUpdatedAt,
  } = useUniswapQuote({
    tokenIn: fromToken.address,
    tokenOut: toToken.address,
    amountIn: amount,
    decimalsIn: fromToken.decimals,
    decimalsOut: toToken.decimals,
    fromAddress: address,
  });

  useEffect(() => {
    if (!dataUpdatedAt) return;
    const update = () => setQuoteAgeMs(Date.now() - dataUpdatedAt);
    update();
    const id = setInterval(update, 5_000);
    return () => clearInterval(id);
  }, [dataUpdatedAt]);

  const toAmount = quoteResult?.amountOutFormatted ?? "";

  const handleFlip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount("");
  };

  const canExecute = !!quoteResult && !quoteFetching && Number(amount) > 0 && !!address;

  // ── submitWithQuote ──────────────────────────────────────────────────────────

  const submitWithQuote = useCallback(
    async (result: UniswapQuoteResult) => {
      if (!address) return;

      const isFromNative = fromToken.address.toLowerCase() === NATIVE_ETH.toLowerCase();
      const isToNative = toToken.address.toLowerCase() === NATIVE_ETH.toLowerCase();
      const amountInWei = parseAmount(amount, fromToken.decimals);
      const resolvedIn = resolveForUniswap(fromToken.address);
      const amountOutMin = result.amountOutMinimum;

      const transactions: Array<{ to: `0x${string}`; data: `0x${string}`; value: string }> = [];

      // Approval for ERC-20 input (exact amount, not unlimited)
      if (!isFromNative) {
        transactions.push({
          to: fromToken.address as `0x${string}`,
          data: buildApproveCalldata(UNISWAP_SWAP_ROUTER, amountInWei),
          value: "0x0",
        });
      }

      if (isToNative) {
        // ERC-20 → native ETH: multicall [swap to WETH9 at router, unwrapWETH9 to user]
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
        // ETH → ERC-20 or ERC-20 → ERC-20
        const resolvedOut = resolveForUniswap(toToken.address);
        transactions.push({
          to: UNISWAP_SWAP_ROUTER as `0x${string}`,
          data: buildSwapCalldata({
            tokenIn: resolvedIn,
            tokenOut: resolvedOut,
            fee: result.fee,
            recipient: address,
            amountIn: amountInWei,
            amountOutMinimum: amountOutMin,
          }),
          // Send ETH value when tokenIn resolves to WETH9 (i.e. native ETH input)
          value: isFromNative ? `0x${amountInWei.toString(16)}` : "0x0",
        });
      }

      try {
        const res = await MiniKit.sendTransaction({
          chainId: WORLD_CHAIN_ID,
          transactions,
        });
        const data = res.data as { userOpHash?: string; transactionHash?: string } | null;
        const hash = data?.userOpHash ?? data?.transactionHash;
        if (hash) {
          setTxHash(hash);
          setStep("success");
        } else {
          setErrorMsg("Transaction rejected.");
          setStep("error");
        }
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Transaction failed");
        setStep("error");
      } finally {
        setIsExecuting(false);
        executionInFlight.current = false;
        setPendingFreshQuote(null);
      }
    },
    [address, fromToken, toToken, amount],
  );

  // ── execute ──────────────────────────────────────────────────────────────────

  const execute = useCallback(async () => {
    if (executionInFlight.current || !address) return;

    executionInFlight.current = true;
    setIsExecuting(true);

    try {
      const amountInWei = parseAmount(amount, fromToken.decimals);
      const freshQuote = await getBestQuote(fromToken.address, toToken.address, amountInWei);

      if (!freshQuote) {
        setErrorMsg("Could not get a fresh quote. Please try again.");
        setStep("error");
        setIsExecuting(false);
        executionInFlight.current = false;
        return;
      }

      // Security: validate the router we'll call
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

      // Price drift check: if fresh output is >1.5% worse than displayed, pause
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

  // ── Success screen ────────────────────────────────────────────────────────────

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
              swap submitted · sent to network
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
            className="w-full py-[15px] rounded-2xl text-[14px] font-semibold text-white active:scale-[0.98] transition-transform"
            style={{
              background: "linear-gradient(180deg, #7C6FE8 0%, #5A4FCC 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            Swap again
          </button>
        </div>
      </div>
    );
  }

  // ── Quote-changed screen ──────────────────────────────────────────────────────

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
          className="w-full py-[15px] rounded-2xl text-[14px] font-semibold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          style={{
            background: "linear-gradient(180deg, #7C6FE8 0%, #5A4FCC 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
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

  // ── Error screen ──────────────────────────────────────────────────────────────

  if (step === "error") {
    const isUserCancelled = errorMsg === "Transaction rejected.";
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

  // ── Form ──────────────────────────────────────────────────────────────────────

  const hasAmount = Number(amount) > 0;
  const isFetchingRoute = quoteFetching && hasAmount && !isExecuting;
  const isNoRoute = !quoteFetching && !quoteResult && hasAmount && !isExecuting;
  const isNeutral = isNoRoute || !hasAmount;

  const ctaLabel = isExecuting
    ? "Processing…"
    : isFetchingRoute
    ? "Finding route…"
    : isNoRoute
    ? "No route available"
    : canExecute
    ? `Swap ${fromSymbol} → ${toSymbol}`
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
          Swap
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

      {/* ── You pay ─────────────────────────────────────────────────────── */}
      <TokenBlock
        label="You pay"
        token={fromToken}
        onTokenChange={setFromToken}
        amount={amount}
        onAmountChange={setAmount}
        heldAddresses={heldAddresses}
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

      {/* ── You receive ─────────────────────────────────────────────────── */}
      <TokenBlock
        label="You receive"
        token={toToken}
        onTokenChange={setToToken}
        amount={toAmount}
        isReadOnly
        isLoading={quoteFetching && hasAmount}
      />

      {/* ── Route details ───────────────────────────────────────────────── */}
      {quoteResult && (
        <RouteDetails
          result={quoteResult}
          toSymbol={toSymbol}
          quoteAgeMs={quoteAgeMs}
          isFetching={quoteFetching}
        />
      )}

      {/* ── No route ────────────────────────────────────────────────────── */}
      {isNoRoute && <NoRouteSuggestions fromToken={fromToken} />}

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <div className="pt-1" />
      <button
        onClick={execute}
        disabled={!canExecute || isExecuting || isFetchingRoute}
        className="w-full py-[15px] rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98]"
        style={{
          background: isNeutral
            ? "#141414"
            : "linear-gradient(180deg, #7C6FE8 0%, #5A4FCC 100%)",
          color: isNeutral ? "rgba(255,255,255,0.28)" : "white",
          opacity: isExecuting ? 1 : isFetchingRoute ? 0.7 : 1,
          border: isNeutral ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
          boxShadow: isNeutral
            ? "none"
            : "inset 0 1px 0 rgba(255,255,255,0.10), 0 1px 3px rgba(0,0,0,0.3)",
          letterSpacing: "-0.015em",
        }}
      >
        {(isExecuting || isFetchingRoute) && (
          <Loader2 size={14} className="animate-spin" style={{ opacity: 0.8 }} />
        )}
        {ctaLabel}
      </button>
    </div>
  );
}
