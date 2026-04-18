export function formatUSD(value: number, compact = false): string {
  if (isNaN(value)) return "$0.00";
  if (compact && Math.abs(value) >= 1_000_000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: value < 0.01 && value > 0 ? 6 : 2,
  }).format(value);
}

export function formatToken(value: number, symbol: string, maxDecimals = 6): string {
  if (isNaN(value) || value === 0) return `0 ${symbol}`;
  if (value < 0.000001) return `<0.000001 ${symbol}`;
  const decimals = value < 0.01 ? maxDecimals : value < 1 ? 4 : 4;
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })} ${symbol}`;
}

export function formatAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatPercent(value: number): string {
  if (isNaN(value)) return "0.00%";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatChange(value: number): string {
  if (isNaN(value)) return "+$0.00";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatUSD(Math.abs(value))}`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatTokenAmount(raw: string, decimals: number, dp = 6): string {
  if (!raw || raw === "0") return "0";
  try {
    const n = Number(BigInt(raw)) / Math.pow(10, decimals);
    if (n === 0) return "0";
    if (n < 0.000001) return "<0.000001";
    return n.toFixed(dp).replace(/\.?0+$/, "");
  } catch {
    return "0";
  }
}

export function parseTokenAmount(amount: string, decimals: number): bigint {
  if (!amount || amount === "0") return BigInt(0);
  const [whole, frac = ""] = amount.split(".");
  const fracPadded = frac.padEnd(decimals, "0").slice(0, decimals);
  return BigInt((whole || "0") + fracPadded);
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`;
  if (seconds < 3600) return `~${Math.round(seconds / 60)}min`;
  return `~${Math.round(seconds / 3600)}h`;
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

/**
 * Format a timestamp for chart scrub display.
 * Adapts precision to the chart's time range.
 */
export function formatScrubTime(timestamp: number, days: number | "max"): string {
  const d = new Date(timestamp);
  if (days === 1) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (days === 7) {
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (days === 30) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (days === 365) {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  // ALL / "max"
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
