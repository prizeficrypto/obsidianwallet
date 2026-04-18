"use client";

import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http } from "viem";
import { SEARCH_TOKENS } from "@/lib/searchTokens";
import type { PriceMap } from "@/lib/prices";

const BALANCE_OF_ABI = [
  {
    name: "balanceOf",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [{ name: "account", type: "address" as const }],
    outputs: [{ name: "", type: "uint256" as const }],
  },
] as const;

// World Chain (chainId 480) — OP Stack L2 with Multicall3 at standard address
const worldChain = {
  id: 480,
  name: "World Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://worldchain-mainnet.g.alchemy.com/public"] },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11" as `0x${string}`,
    },
  },
} as const;

const client = createPublicClient({
  chain: worldChain,
  transport: http("https://worldchain-mainnet.g.alchemy.com/public"),
});

export interface ERC20Balance {
  symbol: string;
  name: string;
  logoURI: string;
  contractAddress: string;
  coingeckoId: string | null;
  balance: number;
  balanceUSD: number;
  priceChange24h: number;
}

/**
 * Fetches all ERC-20 token balances for the user's address on World Chain
 * using a single multicall — one RPC round-trip regardless of token count.
 *
 * WLD is excluded (handled separately by useWldBalance).
 * Tokens with zero balance are filtered out.
 */
export function useWorldChainTokenBalances(
  address: string | null,
  prices: PriceMap | undefined
) {
  return useQuery<ERC20Balance[]>({
    queryKey: ["wc-erc20-balances", address],
    enabled: !!address && !!prices,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
    queryFn: async () => {
      if (!address || !prices) return [];

      const contracts = SEARCH_TOKENS.map((token) => ({
        address: token.contractAddress as `0x${string}`,
        abi: BALANCE_OF_ABI,
        functionName: "balanceOf" as const,
        args: [address as `0x${string}`],
      }));

      const results = await client.multicall({
        contracts,
        allowFailure: true,
      });

      const balances: ERC20Balance[] = [];

      for (let i = 0; i < SEARCH_TOKENS.length; i++) {
        const result = results[i];
        const token = SEARCH_TOKENS[i];

        if (result.status !== "success") continue;
        const raw = result.result as bigint;
        if (raw === 0n) continue;

        const balance = Number(raw) / 10 ** token.decimals;
        const price = token.coingeckoId ? prices[token.coingeckoId] : null;
        const balanceUSD = balance * (price?.usd ?? 0);

        balances.push({
          symbol: token.symbol,
          name: token.name,
          logoURI: token.logoURI,
          contractAddress: token.contractAddress,
          coingeckoId: token.coingeckoId,
          balance,
          balanceUSD,
          priceChange24h: price?.usd_24h_change ?? 0,
        });
      }

      return balances.sort((a, b) => b.balanceUSD - a.balanceUSD);
    },
  });
}
