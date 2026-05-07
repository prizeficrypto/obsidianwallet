"use client";

import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http } from "viem";
import {
  MORPHO_VAULT_ADDRESS,
  VAULT_ABI,
  VAULT_INFO,
  WORLD_CHAIN_ID,
} from "@/lib/morpho";
import type { VaultStatePayload } from "@/app/api/morpho-vault/route";

/**
 * useMorphoPosition — read-only view of a user's Re7 WLD vault position.
 *
 * Yield auto-compounds on the vault: there is no claim function. The
 * user's shares appreciate as the vault's totalAssets grow from
 * underlying market interest. Current value is just `previewRedeem`
 * — the contract's own answer to "if you redeem these shares now, how
 * much WLD do you get?" — so the displayed balance is exact.
 */

const worldChainClient = createPublicClient({
  chain: {
    id: WORLD_CHAIN_ID,
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
  },
  transport: http("https://worldchain-mainnet.g.alchemy.com/public"),
});

export interface MorphoBalance {
  /** Vault shares held by the user (Re7WLD ERC-20 balance). */
  shares: bigint;
  /** Underlying WLD assets the shares are worth right now. */
  assets: bigint;
  /** Convenience: assets formatted as a human-readable WLD number. */
  assetsFormatted: number;
  /** Annualized net supply APY as a fraction (0.0209 = 2.09%). */
  supplyApy: number;
  /** When the read landed, unix seconds. */
  computedAt: number;
}

const EMPTY: MorphoBalance = {
  shares: 0n,
  assets: 0n,
  assetsFormatted: 0,
  supplyApy: 0,
  computedAt: 0,
};

export function useMorphoPosition(address: string | null) {
  return useQuery<MorphoBalance>({
    queryKey: ["morpho-position", address?.toLowerCase() ?? null],
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
    queryFn: async () => {
      if (!address) return EMPTY;

      // Step 1: get user's share balance.
      const shares = (await worldChainClient.readContract({
        address: MORPHO_VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      })) as bigint;

      // Step 2: in parallel, ask the vault what those shares are worth
      // and ask our server-side cache for the current APY.
      const [assets, vaultState] = await Promise.all([
        shares > 0n
          ? (worldChainClient.readContract({
              address: MORPHO_VAULT_ADDRESS,
              abi: VAULT_ABI,
              functionName: "previewRedeem",
              args: [shares],
            }) as Promise<bigint>)
          : Promise.resolve(0n),
        fetchVaultApy().catch(() => 0),
      ]);

      return {
        shares,
        assets,
        assetsFormatted: Number(assets) / 10 ** VAULT_INFO.decimals,
        supplyApy: vaultState,
        computedAt: Math.floor(Date.now() / 1000),
      };
    },
  });
}

/**
 * Standalone, non-React variant — useful from scripts/tests or anywhere
 * outside a component tree.
 */
export async function getMorphoBalance(user: string): Promise<MorphoBalance> {
  const shares = (await worldChainClient.readContract({
    address: MORPHO_VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "balanceOf",
    args: [user as `0x${string}`],
  })) as bigint;

  const [assets, apy] = await Promise.all([
    shares > 0n
      ? (worldChainClient.readContract({
          address: MORPHO_VAULT_ADDRESS,
          abi: VAULT_ABI,
          functionName: "previewRedeem",
          args: [shares],
        }) as Promise<bigint>)
      : Promise.resolve(0n),
    fetchVaultApy().catch(() => 0),
  ]);

  return {
    shares,
    assets,
    assetsFormatted: Number(assets) / 10 ** VAULT_INFO.decimals,
    supplyApy: apy,
    computedAt: Math.floor(Date.now() / 1000),
  };
}

async function fetchVaultApy(): Promise<number> {
  if (typeof fetch === "undefined") return 0;
  // Browser code hits our same-origin proxy; server code can hit the
  // proxy's URL too because Next.js exposes it on localhost during SSR.
  const url =
    typeof window !== "undefined"
      ? "/api/morpho-vault"
      : "http://localhost:3000/api/morpho-vault";
  try {
    const res = await fetch(url);
    if (!res.ok) return 0;
    const json = (await res.json()) as VaultStatePayload;
    return json.netApy ?? 0;
  } catch {
    return 0;
  }
}
