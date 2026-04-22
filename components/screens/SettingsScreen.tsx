"use client";

import { useState } from "react";
import { ArrowLeft, ChevronRight, Shield, Globe, Eye, EyeOff, LogOut, ExternalLink, Vibrate, Check, Languages } from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { useI18nStore, type Language } from "@/store/i18nStore";
import { useTranslation } from "@/hooks/useTranslation";
import { formatAddress } from "@/lib/format";
import type { WalletState } from "@/hooks/useWallet";

interface SettingsScreenProps {
  wallet: WalletState & { disconnect: () => void };
  onBack: () => void;
}

function SettingRow({
  label,
  value,
  onPress,
  icon,
  danger,
  disabled,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onPress}
      disabled={disabled}
      className="flex items-center gap-3 w-full px-4 py-[11px] active:bg-white/[0.03] transition-colors"
      style={disabled ? { opacity: 0.45 } : undefined}
    >
      {icon && (
        <div className="w-4 flex items-center justify-center flex-shrink-0 opacity-50">
          {icon}
        </div>
      )}
      <span
        className="flex-1 text-[13px] font-medium text-left"
        style={{ color: danger ? "#f87171" : "rgba(255,255,255,0.88)" }}
      >
        {label}
      </span>
      {value && (
        <span className="text-[12px] mr-1" style={{ color: "rgba(255,255,255,0.28)" }}>
          {value}
        </span>
      )}
      {onPress && !danger && <ChevronRight size={13} className="text-white/[0.18]" />}
    </button>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p
      className="px-4 pt-4 pb-1"
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.07em",
        color: "rgba(255,255,255,0.22)",
        textTransform: "uppercase",
      }}
    >
      {title}
    </p>
  );
}

function Divider() {
  return <div className="mx-4" style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />;
}

function SettingGroup({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-4 rounded-2xl overflow-hidden"
      style={{ background: "#111111" }}
    >
      {children}
    </div>
  );
}

import { CURRENCY_SYMBOLS, CURRENCY_NAMES } from "@/hooks/useCurrency";

// ─── Language Picker ──────────────────────────────────────────────────────────

const LANGUAGE_OPTIONS: { code: Language; flag: string; name: string; native: string }[] = [
  { code: "en", flag: "🇺🇸", name: "English",    native: "English"    },
  { code: "fr", flag: "🇫🇷", name: "French",     native: "Français"   },
  { code: "es", flag: "🇪🇸", name: "Spanish",    native: "Español"    },
  { code: "pt", flag: "🇧🇷", name: "Portuguese", native: "Português"  },
  { code: "id", flag: "🇮🇩", name: "Indonesian", native: "Indonesia"  },
  { code: "de", flag: "🇩🇪", name: "German",     native: "Deutsch"    },
  { code: "vi", flag: "🇻🇳", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "it", flag: "🇮🇹", name: "Italian",    native: "Italiano"   },
];

function LanguagePicker({
  current,
  onSelect,
  onClose,
}: {
  current: Language;
  onSelect: (lang: Language) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 80 }}
      />
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 430,
          background: "#111111",
          borderRadius: "20px 20px 0 0",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          zIndex: 90,
          paddingBottom: "env(safe-area-inset-bottom, 20px)",
        }}
      >
        <div style={{ padding: "12px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ width: 32, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "0 auto 12px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "#1e1e1e",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, border: "none", cursor: "pointer",
              }}
            >
              <ArrowLeft size={15} strokeWidth={2} style={{ color: "rgba(255,255,255,0.6)" }} />
            </button>
            <p style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.88)", letterSpacing: "-0.01em" }}>
              Language
            </p>
          </div>
        </div>
        <div style={{ paddingTop: 4, paddingBottom: 8, overflowY: "auto", maxHeight: "60vh" }}>
          {LANGUAGE_OPTIONS.map((opt, i) => (
            <div key={opt.code}>
              <button
                onClick={() => { onSelect(opt.code); onClose(); }}
                className="w-full flex items-center gap-3 px-5 active:bg-white/[0.03] transition-colors"
                style={{ paddingTop: 13, paddingBottom: 13 }}
              >
                <div
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "#1e1e1e",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, fontSize: 18,
                  }}
                >
                  {opt.flag}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)", letterSpacing: "-0.01em" }}>
                    {opt.native}
                  </p>
                  <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                    {opt.name}
                  </p>
                </div>
                {current === opt.code && <Check size={15} strokeWidth={2.5} style={{ color: "rgba(255,255,255,0.7)", flexShrink: 0 }} />}
              </button>
              {i < LANGUAGE_OPTIONS.length - 1 && (
                <div style={{ height: 1, marginLeft: 68, marginRight: 20, background: "rgba(255,255,255,0.04)" }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "KRW", "ARS",
  "THB", "CHF", "CAD", "BRL", "TRY", "INR", "SGD", "HKD",
] as const;

function CurrencyPicker({
  current,
  onSelect,
  onClose,
}: {
  current: string;
  onSelect: (c: "USD" | "EUR" | "GBP" | "JPY" | "KRW" | "ARS" | "THB" | "CHF" | "CAD" | "BRL" | "TRY" | "INR" | "SGD" | "HKD") => void;
  onClose: () => void;
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 80 }}
      />
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 430,
          background: "#111111",
          borderRadius: "20px 20px 0 0",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          zIndex: 90,
          paddingBottom: "env(safe-area-inset-bottom, 20px)",
        }}
      >
        <div style={{ padding: "12px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ width: 32, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "0 auto 12px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "#1e1e1e",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, border: "none", cursor: "pointer",
              }}
            >
              <ArrowLeft size={15} strokeWidth={2} style={{ color: "rgba(255,255,255,0.6)" }} />
            </button>
            <p style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.88)", letterSpacing: "-0.01em" }}>
              Display Currency
            </p>
          </div>
        </div>
        <div style={{ paddingTop: 4, paddingBottom: 8, overflowY: "auto", maxHeight: "60vh" }}>
          {CURRENCIES.map((c, i) => (
            <div key={c}>
              <button
                onClick={() => { onSelect(c); onClose(); }}
                className="w-full flex items-center gap-3 px-5 active:bg-white/[0.03] transition-colors"
                style={{ paddingTop: 13, paddingBottom: 13 }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#1e1e1e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: (() => { const s = CURRENCY_SYMBOLS[c].trim(); return s.length <= 1 ? 16 : s.length === 2 ? 13 : 10; })(),
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.6)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {CURRENCY_SYMBOLS[c].trim()}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)", letterSpacing: "-0.01em" }}>
                    {c}
                  </p>
                  <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                    {CURRENCY_NAMES[c]}
                  </p>
                </div>
                {current === c && <Check size={15} strokeWidth={2.5} style={{ color: "#6C5CE7", flexShrink: 0 }} />}
              </button>
              {i < CURRENCIES.length - 1 && (
                <div style={{ height: 1, marginLeft: 68, marginRight: 20, background: "rgba(255,255,255,0.04)" }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function SettingsScreen({ wallet, onBack }: SettingsScreenProps) {
  const { hideBalances, setHideBalances, haptics, setHaptics, currency, setCurrency } = useSettingsStore();
  const { language, setLanguage } = useI18nStore();
  const { t } = useTranslation();
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const currentLang = LANGUAGE_OPTIONS.find((l) => l.code === language);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0a0a" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-12 pb-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center active:bg-white/5 active:scale-90 transition-all duration-100"
          style={{ background: "#181818" }}
        >
          <ArrowLeft size={17} strokeWidth={2} className="text-white/70" />
        </button>
        <h1
          className="text-white font-bold"
          style={{ fontSize: 20, letterSpacing: "-0.02em" }}
        >
          {t("settings.title")}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {/* Profile */}
        <div className="px-4 pt-5 pb-1">
          <div
            className="flex items-center gap-3.5 px-4 py-3 rounded-xl"
            style={{ background: "#111111" }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#2a2a2a" }}
            >
              <span className="text-white text-[13px] font-bold">
                {wallet.username ? wallet.username.slice(0, 2).toUpperCase() : "ST"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-white truncate">
                {wallet.username ? `@${wallet.username}` : "My Wallet"}
              </p>
              <p
                className="text-[12px] font-mono mt-0.5 truncate"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                {wallet.address ? formatAddress(wallet.address, 6) : "Not connected"}
              </p>
            </div>
            {wallet.isOrbVerified && (
              <div
                className="flex items-center gap-1 px-2 py-[3px] rounded flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
              >
                <Shield size={10} strokeWidth={2} />
                <span className="text-[10px] font-bold uppercase tracking-[0.04em]">Orb</span>
              </div>
            )}
          </div>
        </div>

        {/* Preferences */}
        <SectionHeader title={t("settings.preferences")} />
        <SettingGroup>
          <SettingRow
            label={t("settings.hideBalances")}
            value={hideBalances ? t("settings.on") : t("settings.off")}
            icon={hideBalances
              ? <EyeOff size={15} className="text-white/50" />
              : <Eye size={15} className="text-white/50" />
            }
            onPress={() => setHideBalances(!hideBalances)}
          />
          <Divider />
          <SettingRow
            label={t("settings.haptics")}
            value={haptics ? t("settings.on") : t("settings.off")}
            icon={<Vibrate size={15} className="text-white/50" />}
            onPress={() => setHaptics(!haptics)}
          />
          <Divider />
          <SettingRow
            label={t("settings.currency")}
            value={currency}
            icon={<Globe size={15} className="text-white/50" />}
            onPress={() => setCurrencyPickerOpen(true)}
          />
          <Divider />
          <SettingRow
            label={t("settings.language")}
            value={currentLang?.native ?? "English"}
            icon={<Languages size={15} className="text-white/50" />}
            onPress={() => setLanguagePickerOpen(true)}
          />
        </SettingGroup>

        {/* Security */}
        <SectionHeader title={t("settings.security")} />
        <SettingGroup>
          <SettingRow
            label={t("settings.worldId")}
            value={wallet.isOrbVerified ? t("settings.orbVerified") : t("settings.none")}
            icon={<Shield size={15} className="text-white/50" />}
          />
        </SettingGroup>

        {/* Resources */}
        <SectionHeader title={t("settings.links")} />
        <SettingGroup>
          <SettingRow
            label={t("settings.explorer")}
            icon={<ExternalLink size={15} className="text-white/50" />}
            onPress={() => window.open("https://worldscan.org", "_blank")}
          />
        </SettingGroup>

        {/* Account */}
        <SectionHeader title={t("settings.account")} />
        <SettingGroup>
          <SettingRow
            label={t("settings.disconnect")}
            icon={<LogOut size={15} className="text-red-400" />}
            danger
            onPress={wallet.disconnect}
          />
        </SettingGroup>

        <p
          className="text-center mt-8 px-4"
          style={{ fontSize: 11, color: "rgba(255,255,255,0.12)" }}
        >
          Strata · World Chain
        </p>
      </div>

      {currencyPickerOpen && (
        <CurrencyPicker
          current={currency}
          onSelect={setCurrency}
          onClose={() => setCurrencyPickerOpen(false)}
        />
      )}

      {languagePickerOpen && (
        <LanguagePicker
          current={language}
          onSelect={setLanguage}
          onClose={() => setLanguagePickerOpen(false)}
        />
      )}
    </div>
  );
}
