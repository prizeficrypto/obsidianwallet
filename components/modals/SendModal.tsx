"use client";

import { useState, useEffect } from "react";
import { X, ChevronDown, ArrowUpRight, Check, Search } from "lucide-react";
import { MiniKit } from "@worldcoin/minikit-js";
import { CHAINS } from "@/lib/chains";
import { useTxStore } from "@/store/txStore";
import ChainIcon, { TokenIcon } from "@/components/ChainIcon";
import SlideToConfirm from "@/components/SlideToConfirm";

interface SendModalProps {
  address: string;
  isInWorldApp: boolean;
  onClose: () => void;
}

type Step = "input" | "confirm" | "success" | "error";

interface TokenOption {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  priceUSD?: string;
  isNative?: boolean;
}

// ─── World Chain only for sends ─────────────────────────────────────────────
const WORLD_CHAIN = CHAINS.find((c) => c.id === "world-chain")!;

const LIFI_CHAIN_IDS: Record<string, number> = {
  "world-chain": 480,
};

const NATIVE_ADDR = "0x0000000000000000000000000000000000000000";

async function fetchTokensForChain(chainId: string): Promise<TokenOption[]> {
  const lifiId = LIFI_CHAIN_IDS[chainId];
  if (!lifiId) return [];
  try {
    const res = await fetch(`https://li.quest/v1/tokens?chains=${lifiId}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const tokens: TokenOption[] = (data.tokens?.[lifiId] ?? []).map((t: TokenOption) => ({
      ...t,
      isNative: t.address === NATIVE_ADDR,
    }));
    return tokens.sort((a, b) => (a.isNative ? -1 : b.isNative ? 1 : 0)).slice(0, 50);
  } catch {
    return [];
  }
}

function parseRawAmount(amount: string, decimals: number): string {
  if (!amount || amount === "0") return "0x0";
  const [whole, frac = ""] = amount.split(".");
  const fracPadded = frac.padEnd(decimals, "0").slice(0, decimals);
  const raw = BigInt((whole || "0") + fracPadded);
  return `0x${raw.toString(16)}`;
}

export default function SendModal({ address, isInWorldApp, onClose }: SendModalProps) {
  const { addPending } = useTxStore();
  const [step, setStep] = useState<Step>("input");
  const [selectedToken, setSelectedToken] = useState<TokenOption | null>(null);
  const [tokens, setTokens] = useState<TokenOption[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [tokenSearch, setTokenSearch] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  // Load World Chain tokens on mount
  useEffect(() => {
    setTokensLoading(true);
    fetchTokensForChain(WORLD_CHAIN.id).then((t) => {
      setTokens(t);
      setSelectedToken(t[0] ?? null);
      setTokensLoading(false);
    });
  }, []);

  const token = selectedToken;
  const canSendViaMiniKit = isInWorldApp;

  const isValidAddress = /^0x[0-9a-fA-F]{40}$/.test(toAddress);
  const isValidAmount = Number(amount) > 0;
  const canProceed = isValidAddress && isValidAmount && !!token;

  const filteredTokens = tokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(tokenSearch.toLowerCase()) ||
      t.name.toLowerCase().includes(tokenSearch.toLowerCase())
  );

  // ── MiniKit send handler (returned as Promise for SlideToConfirm) ─────
  const handleSend = async (): Promise<{ hash: string }> => {
    if (!token) throw new Error("No token selected");

    if (!canSendViaMiniKit) {
      throw new Error("Open in World App to send transactions.");
    }

    const rawValue = token.isNative
      ? parseRawAmount(amount, token.decimals)
      : "0x0";

    let data = "0x";
    if (!token.isNative) {
      const [whole, frac = ""] = amount.split(".");
      const fracPadded = frac.padEnd(token.decimals, "0").slice(0, token.decimals);
      const rawAmt = BigInt((whole || "0") + fracPadded);
      const selector = "0xa9059cbb"; // transfer(address,uint256)
      const paddedTo = toAddress.slice(2).padStart(64, "0");
      const paddedAmt = rawAmt.toString(16).padStart(64, "0");
      data = `${selector}${paddedTo}${paddedAmt}`;
    }

    const result = await MiniKit.sendTransaction({
      chainId: 480,
      transactions: [{
        to: token.isNative ? (toAddress as `0x${string}`) : (token.address as `0x${string}`),
        data: data as `0x${string}`,
        value: rawValue,
      }],
    });

    const res = result as { transactionHash?: string; userOpHash?: string; status?: string } | null;
    if (!res || res.status === "rejected") throw new Error("Transaction rejected");

    const hash = res.transactionHash ?? res.userOpHash ?? "";
    if (hash) {
      addPending({
        hash,
        type: "send",
        status: "pending",
        chainId: "world-chain",
        from: address,
        to: toAddress,
        value: rawValue,
        valueFormatted: `${amount} ${token.symbol}`,
        timestamp: Date.now(),
      });
    }
    return { hash };
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#0a0a0a" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pb-4"
        style={{ paddingTop: "max(env(safe-area-inset-top), 48px)" }}
      >
        <h2 className="text-lg font-bold text-white">Send</h2>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full"
          style={{ background: "#1e1e1e" }}
        >
          <X size={16} className="text-white/60" />
        </button>
      </div>

      {/* ── INPUT STEP ── */}
      {step === "input" && (
        <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-4">

          {/* Network — locked to World Chain */}
          <div>
            <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">Network</p>
            <div
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl"
              style={{ background: "#161616" }}
            >
              <div className="flex items-center gap-3">
                <ChainIcon chainId={WORLD_CHAIN.id} size={32} />
                <p className="text-sm font-semibold text-white">{WORLD_CHAIN.name}</p>
              </div>
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: "rgba(108,92,231,0.12)", color: "rgba(108,92,231,0.7)" }}
              >
                Active
              </span>
            </div>
          </div>

          {/* Token */}
          <div>
            <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">Token</p>
            <button
              onClick={() => { setShowTokenPicker(!showTokenPicker); setTokenSearch(""); }}
              disabled={tokensLoading}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl disabled:opacity-50"
              style={{ background: "#161616" }}
            >
              <div className="flex items-center gap-3">
                {token ? (
                  <TokenIcon logoURI={token.logoURI} symbol={token.symbol} size={32} />
                ) : (
                  <div className="w-8 h-8 rounded-xl skeleton" />
                )}
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">{token?.symbol ?? "Select token"}</p>
                  <p className="text-xs text-white/30">{token?.name ?? ""}</p>
                </div>
              </div>
              <ChevronDown size={15} className={`text-white/30 transition-transform ${showTokenPicker ? "rotate-180" : ""}`} />
            </button>

            {showTokenPicker && (
              <div className="mt-1 rounded-2xl overflow-hidden" style={{ background: "#161616" }}>
                <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <Search size={13} className="text-white/30" />
                  <input
                    autoFocus
                    type="text"
                    value={tokenSearch}
                    onChange={(e) => setTokenSearch(e.target.value)}
                    placeholder="Search tokens…"
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 outline-none"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {filteredTokens.slice(0, 30).map((t) => (
                    <button
                      key={t.address}
                      onClick={() => { setSelectedToken(t); setShowTokenPicker(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-white/5"
                    >
                      <TokenIcon logoURI={t.logoURI} symbol={t.symbol} size={28} />
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-semibold text-white">{t.symbol}</p>
                        <p className="text-xs text-white/30 truncate">{t.name}</p>
                      </div>
                      {t.priceUSD && (
                        <p className="text-xs text-white/30">${Number(t.priceUSD).toFixed(2)}</p>
                      )}
                      {token?.address === t.address && <Check size={13} className="text-[#9B8FFF] ml-1" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recipient */}
          <div>
            <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">To</p>
            <div className="rounded-2xl px-4 py-3.5" style={{ background: "#161616" }}>
              <input
                type="text"
                placeholder="0x address"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value.trim())}
                className="w-full bg-transparent text-sm text-white placeholder:text-white/20 outline-none font-mono"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            {toAddress && !isValidAddress && (
              <p className="text-xs text-red-400 mt-1.5 px-1">Invalid address</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">Amount</p>
            <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: "#161616" }}>
              <input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 bg-transparent text-xl font-semibold text-white placeholder:text-white/20 outline-none"
                min="0"
              />
              <span className="text-sm font-semibold text-white/40">{token?.symbol ?? "—"}</span>
            </div>
          </div>

          {!canSendViaMiniKit && canProceed && (
            <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.2)" }}>
              <p className="text-xs text-yellow-400/80 leading-relaxed">
                Open in World App to sign transactions.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── CONFIRM STEP ── */}
      {step === "confirm" && token && (
        <div className="flex-1 px-4 py-6 space-y-4">
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "#161616" }}>
            <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <TokenIcon logoURI={token.logoURI} symbol={token.symbol} size={40} />
              <div>
                <p className="text-xl font-bold text-white">{amount} {token.symbol}</p>
                <p className="text-sm text-white/30">World Chain</p>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">To</span>
              <span className="text-white font-mono text-xs">{toAddress.slice(0, 8)}…{toAddress.slice(-6)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Network</span>
              <span className="text-white font-medium">World Chain</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Fee</span>
              <span className="text-white/60">Sponsored</span>
            </div>
          </div>
        </div>
      )}

      {/* ── SUCCESS STEP ── */}
      {step === "success" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center success-ring" style={{ background: "rgba(46,204,113,0.12)" }}>
            <Check size={28} className="text-emerald-400 success-icon" />
          </div>
          <div className="text-center success-amount">
            <p className="text-xl font-bold text-white mb-1">Sent!</p>
            <p className="text-sm text-white/40">{amount} {token?.symbol} sent to {toAddress.slice(0, 8)}…</p>
          </div>
          {txHash && (
            <a
              href={`https://worldscan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#9B8FFF] underline underline-offset-2 success-details"
            >
              View on Worldscan ↗
            </a>
          )}
        </div>
      )}

      {/* ── ERROR STEP ── */}
      {step === "error" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(231,76,60,0.12)" }}>
            <X size={28} className="text-red-400" />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-white mb-2">Failed</p>
            <p className="text-sm text-white/40 max-w-xs leading-relaxed">{error}</p>
          </div>
          <button
            onClick={() => { setStep("input"); setError(""); }}
            className="px-6 py-3 rounded-full text-sm font-semibold text-white"
            style={{ background: "#1e1e1e" }}
          >
            Try again
          </button>
        </div>
      )}

      {/* ── BOTTOM BUTTONS ── */}
      {(step === "input" || step === "confirm") && (
        <div
          className="px-4 pt-4 border-t"
          style={{
            borderColor: "rgba(255,255,255,0.07)",
            paddingBottom: "max(env(safe-area-inset-bottom), 20px)",
          }}
        >
          {step === "input" ? (
            <button
              onClick={() => setStep("confirm")}
              disabled={!canProceed}
              className="w-full py-4 rounded-2xl text-sm font-semibold text-white disabled:opacity-30 transition-opacity"
              style={{ background: "#6C5CE7" }}
            >
              Review Send
            </button>
          ) : (
            <div className="space-y-3">
              <SlideToConfirm
                label="Slide to send"
                disabled={!canProceed}
                onConfirm={handleSend}
                onSuccess={(hash) => {
                  setTxHash(hash);
                  setStep("success");
                }}
                onError={(err) => {
                  setError(err.message);
                  setStep("error");
                }}
              />
              <button
                onClick={() => setStep("input")}
                className="w-full py-2.5 text-sm font-medium text-white/30 active:text-white/50 transition-colors"
              >
                Back
              </button>
            </div>
          )}
        </div>
      )}

      {step === "success" && (
        <div
          className="px-4 pt-4"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 20px)" }}
        >
          <button onClick={onClose} className="w-full py-4 rounded-2xl text-sm font-semibold text-white" style={{ background: "#6C5CE7" }}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}
