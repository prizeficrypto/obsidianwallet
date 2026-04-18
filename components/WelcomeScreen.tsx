"use client";

interface WelcomeScreenProps {
  onConnect: () => void;
  isLoading: boolean;
  isInWorldApp: boolean;
  username?: string | null;
  isConnected?: boolean;
}

// ── Strata geometric mark ─────────────────────────────────────────────────────
// Three receding bars, each narrower and dimmer than the last —
// a literal representation of geological strata / sedimentary layers.
function StrataMark({ size = 1 }: { size?: number }) {
  const w = Math.round(52 * size);
  const h = Math.round(38 * size);
  return (
    <svg width={w} height={h} viewBox="0 0 52 38" fill="none">
      <rect width="52" height="10" rx="5" fill="white" fillOpacity="0.88" />
      <rect x="8" y="14" width="36" height="10" rx="5" fill="white" fillOpacity="0.52" />
      <rect x="18" y="28" width="16" height="10" rx="5" fill="white" fillOpacity="0.26" />
    </svg>
  );
}

// ── EmptyWalletCard ───────────────────────────────────────────────────────────

function EmptyWalletCard({
  username,
  onDeposit,
  onTransfer,
}: {
  username: string | null;
  onDeposit: () => void;
  onTransfer: () => void;
}) {
  return (
    <div className="mx-4 mt-3 rounded-2xl overflow-hidden p-6" style={{ background: "#161616" }}>
      <div className="flex justify-center mb-6">
        <StrataMark size={0.85} />
      </div>

      <h2
        className="font-bold text-white text-center mb-1"
        style={{ fontSize: 18, letterSpacing: "-0.02em" }}
      >
        Welcome{username ? `, @${username}` : ""}
      </h2>
      <p
        className="text-center mb-6"
        style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}
      >
        Add funds to get started
      </p>

      <div className="space-y-2.5">
        <button
          onClick={onDeposit}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
          style={{ background: "#6C5CE7" }}
        >
          Buy crypto with cash
        </button>
        <button
          onClick={onTransfer}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white/70 transition-all active:scale-[0.98]"
          style={{ background: "#222222" }}
        >
          Transfer crypto
        </button>
      </div>
    </div>
  );
}

// ── ConnectCard ───────────────────────────────────────────────────────────────

function ConnectCard({
  onConnect,
  isLoading,
  isInWorldApp,
}: {
  onConnect: () => void;
  isLoading: boolean;
  isInWorldApp: boolean;
}) {
  return (
    <div
      className="flex flex-col min-h-screen select-none"
      style={{ background: "#080808" }}
    >
      {/* ── Brand area (vertically centered, slightly above midpoint) ── */}
      <div className="flex-1 flex flex-col items-center justify-center" style={{ paddingBottom: "18vh" }}>
        <div className="mb-7">
          <StrataMark size={1.15} />
        </div>

        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "white",
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          Strata
        </h1>
        <p
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: "rgba(255,255,255,0.28)",
            marginTop: 9,
          }}
        >
          World Chain portfolio
        </p>
      </div>

      {/* ── CTA pinned to bottom ── */}
      <div className="px-6 pb-10 space-y-3">
        <button
          onClick={onConnect}
          disabled={isLoading}
          className="w-full py-[17px] rounded-2xl font-semibold text-white text-[15px] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: "#6C5CE7", letterSpacing: "-0.015em" }}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" opacity="0.25" />
                <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Connecting…
            </>
          ) : isInWorldApp ? (
            "Sign in with World ID"
          ) : (
            "Connect wallet"
          )}
        </button>

        {!isInWorldApp && (
          <p
            className="text-center"
            style={{ fontSize: 11, color: "rgba(255,255,255,0.16)" }}
          >
            Open in World App for the full experience
          </p>
        )}
      </div>
    </div>
  );
}

// ── WelcomeScreen ─────────────────────────────────────────────────────────────

export default function WelcomeScreen({
  onConnect,
  isLoading,
  isInWorldApp,
}: WelcomeScreenProps) {
  return (
    <ConnectCard
      onConnect={onConnect}
      isLoading={isLoading}
      isInWorldApp={isInWorldApp}
    />
  );
}

export { EmptyWalletCard };
