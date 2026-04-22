"use client";

import { type LucideIcon } from "lucide-react";

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger";
}

const variantStyle = {
  default: { bg: "#1e1e1e", iconColor: "rgba(255,255,255,0.7)" },
  primary: { bg: "#ffffff", iconColor: "#111111" },
  danger:  { bg: "rgba(231,76,60,0.15)", iconColor: "#E74C3C" },
};

export function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  variant = "default",
}: ActionButtonProps) {
  const { bg, iconColor } = variantStyle[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-2 group disabled:opacity-40"
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90"
        style={{ background: bg }}
      >
        <Icon size={20} strokeWidth={1.8} style={{ color: iconColor }} />
      </div>
      <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
        {label}
      </span>
    </button>
  );
}
