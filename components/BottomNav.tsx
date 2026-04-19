"use client";

import { Home, Clock, TrendingUp, PieChart } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { t } = useTranslation();

  const NAV_ITEMS = [
    { id: "home",      icon: Home,       label: t("nav.home")      },
    { id: "activity",  icon: Clock,      label: t("nav.activity")  },
    { id: "swap",      icon: TrendingUp, label: t("nav.invest")    },
    { id: "portfolio", icon: PieChart,   label: t("nav.portfolio") },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
        paddingLeft: 16,
        paddingRight: 16,
        maxWidth: 430,
        margin: "0 auto",
        left: 0,
        right: 0,
      }}
    >
      <div
        className="pointer-events-auto flex items-center w-full"
        style={{
          background: "rgba(14,14,18,0.82)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          borderRadius: 32,
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)",
          padding: "5px 5px",
          gap: 2,
        }}
      >
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className="flex-1 flex flex-col items-center gap-[4px] active:scale-90 transition-all duration-150 relative"
              style={{
                padding: "8px 4px",
                borderRadius: 26,
                background: active
                  ? "rgba(255,255,255,0.11)"
                  : "transparent",
                transition: "background 0.2s ease",
              }}
            >
              <Icon
                size={18}
                strokeWidth={active ? 2 : 1.5}
                style={{
                  color: active
                    ? "rgba(255,255,255,0.92)"
                    : "rgba(255,255,255,0.28)",
                  transition: "color 0.2s ease",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: active ? 600 : 400,
                  letterSpacing: "0.01em",
                  color: active
                    ? "rgba(255,255,255,0.7)"
                    : "rgba(255,255,255,0.22)",
                  transition: "color 0.2s ease",
                  lineHeight: 1,
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
