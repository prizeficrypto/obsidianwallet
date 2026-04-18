"use client";

import { useQuery } from "@tanstack/react-query";

// Li.Fi status values
// https://docs.li.fi/li.fi-api/checking-the-status-of-a-transaction
export type BridgeStatusValue = "PENDING" | "DONE" | "FAILED" | "INVALID" | "NOT_FOUND";

export interface BridgeStatusResult {
  status: BridgeStatusValue;
  substatus?: string;
  substatusMessage?: string;
  sending?: { txHash?: string; chainId?: number };
  receiving?: { txHash?: string; chainId?: number };
}

export function useBridgeStatus({
  txHash,
  fromChainId,
  toChainId,
  enabled = true,
}: {
  txHash: string | null;
  fromChainId: number | null;
  toChainId: number | null;
  enabled?: boolean;
}) {
  return useQuery<BridgeStatusResult | null>({
    queryKey: ["bridge-status", txHash, fromChainId, toChainId],
    enabled: enabled && !!txHash && !!fromChainId && !!toChainId,

    // Poll every 10s while pending; stop when done or failed.
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 10_000;
      if (data.status === "DONE" || data.status === "FAILED" || data.status === "INVALID") {
        return false;
      }
      return 10_000;
    },

    staleTime: 0, // Always re-fetch on refetch interval — never serve stale status

    queryFn: async () => {
      const url =
        `https://li.quest/v1/status` +
        `?bridge=lifi` +
        `&fromChain=${fromChainId}` +
        `&toChain=${toChainId}` +
        `&txHash=${txHash}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.status === 404) return { status: "NOT_FOUND" as BridgeStatusValue };
      if (!res.ok) return null;
      return res.json() as Promise<BridgeStatusResult>;
    },
  });
}
