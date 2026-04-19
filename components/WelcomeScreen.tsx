"use client";

import { useTranslation } from "@/hooks/useTranslation";

interface WelcomeScreenProps {
  onConnect: () => void;
  isLoading: boolean;
  isInWorldApp: boolean;
  username?: string | null;
  isConnected?: boolean;
}

// ── Obsidian mark ─────────────────────────────────────────────────────────────
function ObsidianMark({ size = 1 }: { size?: number }) {
  const w = Math.round(24 * size);
  const h = Math.round(32 * size);
  return (
    <svg width={w} height={h} viewBox="0 0 24 32" fill="none">
      <path d="M12 0 L24 16 L12 20 L0 16 Z" fill="white" fillOpacity="0.9" />
      <path d="M12 20 L24 16 L12 32 L0 16 Z" fill="white" fillOpacity="0.3" />
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
        <ObsidianMark size={0.85} />
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
          className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: "white", color: "#111111" }}
        >
          Buy crypto with cash
        </button>
        <button
          onClick={onTransfer}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: "#222222", color: "rgba(255,255,255,0.7)" }}
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
  const { t } = useTranslation();

  return (
    <div
      className="flex flex-col min-h-screen select-none"
      style={{ background: "#080808" }}
    >
      {/* ── Brand block — slightly above center ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center"
        style={{ paddingBottom: "16vh" }}
      >
        <ObsidianMark size={1.2} />

        <h1
          style={{
            fontSize: 34,
            fontWeight: 700,
            color: "white",
            letterSpacing: "-0.045em",
            lineHeight: 1,
            marginTop: 18,
          }}
        >
          Obsidian
        </h1>

        <div
          style={{
            width: 24,
            height: 1,
            background: "rgba(255,255,255,0.08)",
            margin: "12px 0 11px",
          }}
        />

        <p
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: "rgba(255,255,255,0.32)",
            letterSpacing: "-0.005em",
          }}
        >
          {t("welcome.tagline")}
        </p>
      </div>

      {/* ── CTA pinned to bottom ── */}
      <div className="px-6 pb-10">
        <p
          className="text-center"
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.18)",
            letterSpacing: "0.02em",
            marginBottom: 12,
          }}
        >
          {t("welcome.securityNote")}
        </p>

        <button
          onClick={onConnect}
          disabled={isLoading}
          className="w-full py-[17px] rounded-2xl font-semibold text-[15px] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          style={{
            background: "white",
            color: "#111111",
            letterSpacing: "-0.015em",
          }}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#111111" strokeWidth="3" opacity="0.25" />
                <path d="M12 2a10 10 0 0110 10" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
              </svg>
              {t("welcome.connecting")}
            </>
          ) : isInWorldApp ? (
            t("welcome.connect")
          ) : (
            t("welcome.connectWeb")
          )}
        </button>

        {!isInWorldApp && (
          <p
            className="text-center"
            style={{ fontSize: 11, color: "rgba(255,255,255,0.14)", marginTop: 12 }}
          >
            {t("welcome.openInWorldApp")}
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
