"use client";

import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http } from "viem";

export const WLD_ADDRESS = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003" as const;
// CoinGecko stable URL for WLD token icon
export const WLD_LOGO = "https://assets.coingecko.com/coins/images/31069/small/worldcoin.jpeg";
export const WLD_DECIMALS = 18;

const BALANCE_OF_ABI = [
  {
    name: "balanceOf",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [{ name: "account", type: "address" as const }],
    outputs: [{ name: "", type: "uint256" as const }],
  },
] as const;

const worldChainClient = createPublicClient({
  chain: {
    id: 480,
    name: "World Chain",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://worldchain-mainnet.g.alchemy.com/public"] } },
  },
  transport: http("https://worldchain-mainnet.g.alchemy.com/public"),
});

export interface WldBalance {
  raw: bigint;
  formatted: string;
  /** USD value — computed by caller from latest price so it stays fresh */
  usd: number;
  logoURI: string;
}

/** Returns the raw WLD balance. usd is passed in from parent so it stays in sync with live price. */
export function useWldBalance(address: string | null, wldPriceUSD: number) {
  const { data: raw, isLoading } = useQuery<bigint>({
    queryKey: ["wld-balance-raw", address],
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
    queryFn: async () => {
      if (!address) return BigInt(0);
      return await worldChainClient.readContract({
        address: WLD_ADDRESS,
        abi: BALANCE_OF_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      });
    },
  });

  if (!address || isLoading || raw === undefined) return { data: undefined };

  const amount = Number(raw) / 1e18;
  const formatted = amount === 0 ? "0" : amount.toFixed(4).replace(/\.?0+$/, "");
  const usd = amount * wldPriceUSD;

  return {
    data: { raw, formatted, usd, logoURI: WLD_LOGO } satisfies WldBalance,
  };
}
