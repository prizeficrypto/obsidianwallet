"use client";

import { Skeleton } from "./Skeleton";
import { useCurrency } from "@/hooks/useCurrency";
import type { TokenBalance } from "@/types/chain";

interface TokenRowProps {
  token: TokenBalance;
  onClick?: () => void;
}

export function TokenRow({ token, onClick }: TokenRowProps) {
  const { format } = useCurrency();
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 active:bg-white/5 transition-colors"
    >
      {/* Token icon */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
        style={{ background: "#1e1e1e", color: "rgba(255,255,255,0.6)" }}
      >
        {token.logoURI ? (
          <img
            src={token.logoURI}
            alt={token.symbol}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          token.symbol.slice(0, 2)
        )}
      </div>

      {/* Token info */}
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-semibold text-white leading-tight">{token.symbol}</p>
        <p className="text-xs text-white/30 truncate">{token.name}</p>
      </div>

      {/* Balance */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-white">
          {token.balanceFormatted} {token.symbol}
        </p>
        <p className="text-xs text-white/30">{format(token.balanceUSD)}</p>
      </div>
    </button>
  );
}

export function TokenRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-9 h-9 flex-shrink-0" rounded="full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="text-right space-y-1.5">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3 w-14 ml-auto" />
      </div>
    </div>
  );
}
