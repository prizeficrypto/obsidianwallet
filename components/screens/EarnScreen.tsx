"use client";

import { useMemo, useState } from "react";
import { PiggyBank, ArrowDown, ArrowUp, Info } from "lucide-react";
import { useMorphoPosition } from "@/hooks/useMorphoPosition";
import { useMorphoActions } from "@/hooks/useMorphoActions";
import { parseTokenAmount } from "@/lib/morpho";
import { useSettingsStore } from "@/store/settingsStore";
import type { WldBalance } from "@/hooks/useWldBalance";

interface EarnScreenProps {
  address: string | null;
  /** Wallet WLD balance — used to gate deposits and surface "Max". */
  wldBalance: WldBalance | undefined;
  /** Live USD price of WLD — used to show $ value alongside token amounts. */
  wldPriceUSD: number;
}

type Mode = "deposit" | "withdraw";

/**
 * Earn screen — deposit/withdraw WLD against the Morpho Blue WLD/WETH market.
 *
 * Yield auto-compounds on Morpho Blue (no claim function). The displayed
 * supplied balance is computed in `useMorphoPosition` — it accrues
 * interest locally between on-chain accruals so the number is current
 * to the second.
 */
export default function EarnScreen({
  address,
  wldBalance,
  wldPriceUSD,
}: EarnScreenProps) {
  const [mode, setMode] = useState<Mode>("deposit");
  const [amount, setAmount] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const hideBalances = useSettingsStore((s) => s.hideBalances);

  const { data: position, isLoading: positionLoading, refetch } =
    useMorphoPosition(address);

  const {
    depositToMorpho,
    withdrawFromMorpho,
    state: txState,
    txHash,
    errorMessage: txError,
    reset: resetTx,
  } = useMorphoActions(address);

  // Wallet WLD balance in token units (not wei). Falls back to 0 when
  // the user has none — disables the deposit CTA without crashing.
  const walletWld = useMemo(() => {
    if (!wldBalance) return 0;
    return parseFloat(wldBalance.formatted) || 0;
  }, [wldBalance]);

  const supplied = position?.assetsFormatted ?? 0;

  // Source-of-funds for the active mode (used by Max + validation).
  const available = mode === "deposit" ? walletWld : supplied;

  const fmtWld = (n: number) =>
    n === 0
      ? "0"
      : n < 0.0001
        ? "<0.0001"
        : n.toLocaleString("en-US", { maximumFractionDigits: 4 });

  const fmtUsd = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Annualized USD earnings projection at the current APY — gives the
  // user a concrete reason to deposit, computed off whatever they typed.
  const projectedYearly = useMemo(() => {
    const apy = position?.supplyApy ?? 0;
    const principal = parseFloat(amount || "0");
    if (!Number.isFinite(principal) || principal <= 0) return 0;
    return principal * apy * wldPriceUSD;
  }, [amount, position?.supplyApy, wldPriceUSD]);

  function setMax() {
    setInputError(null);
    if (available <= 0) return;
    // Leave a 4-decimal precision buffer on deposits to dodge gas-price
    // races; on withdraw, Max should pull every share — the actions hook
    // accepts a `sharesOverride` for that, but the simple flow uses
    // assets, so we trim to 6 decimals to avoid rounding-to-overshoot.
    const trimmed = available.toFixed(6).replace(/\.?0+$/, "");
    setAmount(trimmed);
  }

  async function handleSubmit() {
    setInputError(null);
    resetTx();

    let raw: bigint;
    try {
      raw = parseTokenAmount(amount, 18);
    } catch (e) {
      setInputError(e instanceof Error ? e.message : "Invalid amount");
      return;
    }

    // Front-end balance check — the contract would catch this anyway,
    // but we save the user a wasted MiniKit prompt and gas.
    const numeric = parseFloat(amount);
    if (numeric > available + 1e-9) {
      setInputError(mode === "deposit" ? "Exceeds wallet balance" : "Exceeds supplied balance");
      return;
    }

    const useShares =
      mode === "withdraw" &&
      position &&
      // If the user typed something within rounding distance of "all",
      // pass shares to avoid leaving dust behind.
      Math.abs(numeric - supplied) < 0.0001 &&
      position.shares > 0n;

    const hash = useShares
      ? await withdrawFromMorpho(0n, position!.shares)
      : mode === "deposit"
        ? await depositToMorpho(raw)
        : await withdrawFromMorpho(raw);

    if (hash) {
      setAmount("");
      // Pull fresh position data after the tx settles. We don't await
      // a block confirmation here — react-query refetches every 30s and
      // the bumped query key keeps the UI in sync.
      setTimeout(() => refetch(), 4000);
    }
  }

  const canSubmit =
    !!address &&
    amount.trim() !== "" &&
    !inputError &&
    txState !== "pending" &&
    available > 0;

  return (
    <div className="pb-4">
      {/* Hero — current supplied position */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <PiggyBank size={14} strokeWidth={1.75} style={{ color: "rgba(255,255,255,0.4)" }} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.07em",
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
            }}
          >
            WLD Supplied
          </span>
        </div>

        {positionLoading ? (
          <div className="space-y-2">
            <div className="skeleton rounded" style={{ width: 180, height: 38 }} />
            <div className="skeleton rounded" style={{ width: 120, height: 14 }} />
          </div>
        ) : (
          <>
            <p
              className="tabular-nums"
              style={{
                fontSize: 38,
                fontWeight: 700,
                color: "rgba(255,255,255,0.95)",
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
              }}
            >
              {hideBalances ? "••••••" : `${fmtWld(supplied)} WLD`}
            </p>
            <p className="mt-1.5 flex items-center gap-2">
              <span
                className="tabular-nums"
                style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.45)" }}
              >
                {hideBalances ? "$••••" : fmtUsd(supplied * wldPriceUSD)}
              </span>
              {position && position.supplyApy > 0 && (
                <span
                  className="tabular-nums px-1.5 py-[2px] rounded-full"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#4ade80",
                    background: "rgba(74,222,128,0.10)",
                    border: "1px solid rgba(74,222,128,0.18)",
                  }}
                >
                  {(position.supplyApy * 100).toFixed(2)}% APY
                </span>
              )}
            </p>
          </>
        )}
      </div>

      {/* Mode toggle — Deposit / Withdraw */}
      <div
        className="mx-4 mt-4 p-1 flex"
        style={{
          background: "rgba(255,255,255,0.04)",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {(["deposit", "withdraw"] as const).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setAmount("");
                setInputError(null);
                resetTx();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all"
              style={{
                padding: "10px 0",
                borderRadius: 11,
                background: active ? "rgba(255,255,255,0.07)" : "transparent",
              }}
            >
              {m === "deposit" ? (
                <ArrowDown size={13} strokeWidth={2} style={{ color: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)" }} />
              ) : (
                <ArrowUp size={13} strokeWidth={2} style={{ color: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)" }} />
              )}
              <span
                style={{
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.4)",
                  letterSpacing: "-0.005em",
                }}
              >
                {m === "deposit" ? "Deposit" : "Withdraw"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Amount input */}
      <div
        className="mx-4 mt-3 px-4 pt-4 pb-3"
        style={{
          background: "rgba(255,255,255,0.025)",
          borderRadius: 14,
          border: inputError
            ? "1px solid rgba(248,113,113,0.35)"
            : "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center justify-between">
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.04em",
              color: "rgba(255,255,255,0.32)",
              textTransform: "uppercase",
            }}
          >
            {mode === "deposit" ? "From wallet" : "From supplied"}
          </span>
          <span
            className="tabular-nums"
            style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.4)" }}
          >
            {hideBalances ? "•••• WLD" : `${fmtWld(available)} WLD`}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d.]/g, "");
              // Single decimal only
              const parts = v.split(".");
              const safe = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : v;
              setAmount(safe);
              setInputError(null);
              resetTx();
            }}
            className="flex-1 bg-transparent outline-none tabular-nums"
            style={{
              fontSize: 30,
              fontWeight: 600,
              color: "rgba(255,255,255,0.95)",
              letterSpacing: "-0.02em",
              minWidth: 0,
            }}
          />
          <button
            onClick={setMax}
            disabled={available <= 0}
            className="active:scale-95 transition-transform"
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "5px 11px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.06)",
              color: available > 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            MAX
          </button>
          <span
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: "rgba(255,255,255,0.65)",
              letterSpacing: "-0.01em",
            }}
          >
            WLD
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span
            className="tabular-nums"
            style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.3)" }}
          >
            {amount && parseFloat(amount) > 0
              ? fmtUsd(parseFloat(amount) * wldPriceUSD)
              : "$0.00"}
          </span>
          {projectedYearly > 0 && mode === "deposit" && (
            <span
              className="tabular-nums"
              style={{ fontSize: 11, fontWeight: 500, color: "#4ade80" }}
            >
              ≈ {fmtUsd(projectedYearly)} / year
            </span>
          )}
        </div>
      </div>

      {/* Validation / tx error */}
      {(inputError || txError) && (
        <p
          className="mx-4 mt-2"
          style={{ fontSize: 12, fontWeight: 500, color: "#f87171" }}
        >
          {inputError ?? txError}
        </p>
      )}

      {/* Success */}
      {txState === "success" && txHash && (
        <p
          className="mx-4 mt-2"
          style={{ fontSize: 12, fontWeight: 500, color: "#4ade80" }}
        >
          {mode === "deposit" ? "Deposit submitted." : "Withdraw submitted."}
        </p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="mx-4 mt-3 w-[calc(100%-32px)] active:scale-[0.98] transition-transform"
        style={{
          padding: "16px 0",
          borderRadius: 14,
          background: canSubmit ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.06)",
          color: canSubmit ? "#0a0a0a" : "rgba(255,255,255,0.25)",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: "-0.005em",
        }}
      >
        {txState === "pending"
          ? mode === "deposit"
            ? "Depositing…"
            : "Withdrawing…"
          : mode === "deposit"
            ? "Deposit WLD"
            : "Withdraw WLD"}
      </button>

      {/* Footer — market info */}
      <div
        className="mx-4 mt-5 px-3 py-2.5 flex items-start gap-2"
        style={{
          background: "rgba(255,255,255,0.02)",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <Info size={12} strokeWidth={1.75} style={{ color: "rgba(255,255,255,0.3)", marginTop: 2, flexShrink: 0 }} />
        <p
          style={{
            fontSize: 11.5,
            fontWeight: 400,
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.5,
          }}
        >
          Lend WLD on the Morpho WLD/WETH market. Interest auto-compounds — no claiming required.
          Your balance grows continuously while supplied. Withdraw anytime back to your wallet.
        </p>
      </div>
    </div>
  );
}
