import { createPublicClient, http, isAddress, formatUnits } from "viem";
import type { Chain as ViemChain } from "viem";
import type { IChainAdapter } from "../types";
import type { Chain, TokenBalance } from "@/types/chain";
import type { Transaction } from "@/types/transaction";

// ── Fallback RPCs for chains where the primary public endpoint is unreliable ──
const FALLBACK_RPCS: Record<string, string[]> = {
  ethereum: [
    "https://eth.llamarpc.com",
    "https://rpc.ankr.com/eth",
    "https://ethereum-rpc.publicnode.com",
  ],
};

// ── RPC health tracking ─────────────────────────────────────────────
// Lightweight per-endpoint success/failure counters.
// Module-scoped — accumulates during the session, resets on page reload.
// Access via getRpcHealth() for dev tooling or diagnostics.

interface RpcHealthEntry {
  url: string;
  chainId: string;
  successes: number;
  failures: number;
  lastFailure?: number;   // timestamp
  lastSuccess?: number;   // timestamp
  lastError?: string;
}

const rpcHealth = new Map<string, RpcHealthEntry>();

function trackRpcSuccess(chainId: string, url: string) {
  const key = `${chainId}:${url}`;
  const entry = rpcHealth.get(key) ?? { url, chainId, successes: 0, failures: 0 };
  entry.successes++;
  entry.lastSuccess = Date.now();
  rpcHealth.set(key, entry);
}

function trackRpcFailure(chainId: string, url: string, error: unknown) {
  const key = `${chainId}:${url}`;
  const entry = rpcHealth.get(key) ?? { url, chainId, successes: 0, failures: 0 };
  entry.failures++;
  entry.lastFailure = Date.now();
  entry.lastError = error instanceof Error ? error.message : String(error);
  rpcHealth.set(key, entry);
}

/** Returns a snapshot of RPC health data for diagnostics. */
export function getRpcHealth(): RpcHealthEntry[] {
  return Array.from(rpcHealth.values());
}

/** Returns only RPCs with a failure rate above the given threshold (0-1). */
export function getUnhealthyRpcs(threshold = 0.3): RpcHealthEntry[] {
  return getRpcHealth().filter(e => {
    const total = e.successes + e.failures;
    return total > 0 && e.failures / total > threshold;
  });
}

function toViemChain(chain: Chain): ViemChain {
  return {
    id: chain.chainId!,
    name: chain.name,
    nativeCurrency: {
      decimals: chain.nativeCurrency.decimals,
      name: chain.nativeCurrency.name,
      symbol: chain.nativeCurrency.symbol,
    },
    rpcUrls: {
      default: { http: chain.rpcUrls as [string, ...string[]] },
    },
    blockExplorers: {
      default: { name: "Explorer", url: chain.blockExplorerUrl },
    },
  };
}

export class EvmAdapter implements IChainAdapter {
  chain: Chain;
  private clients: ReturnType<typeof createPublicClient>[];
  private rpcUrls: string[];

  constructor(chain: Chain) {
    if (chain.chainType !== "evm" || !chain.chainId) {
      throw new Error(`Chain ${chain.id} is not an EVM chain`);
    }
    this.chain = chain;

    // Build a client for each available RPC (primary + fallbacks).
    // The primary RPC comes from chain config; fallbacks from FALLBACK_RPCS.
    const viemChain = toViemChain(chain);
    const rpcs = [
      chain.rpcUrls[0],
      ...(FALLBACK_RPCS[chain.id] ?? []),
    ];
    // Deduplicate (primary may already be in the fallback list)
    const uniqueRpcs = [...new Set(rpcs)];

    this.rpcUrls = uniqueRpcs;
    this.clients = uniqueRpcs.map((url) =>
      createPublicClient({ chain: viemChain, transport: http(url) })
    );
  }

  async getNativeBalance(address: string): Promise<bigint> {
    if (!this.isValidAddress(address)) return BigInt(0);

    // Try each RPC in order until one succeeds.
    // If all fail, throw so the caller knows this is a failure — not a zero balance.
    let lastError: unknown;
    for (let i = 0; i < this.clients.length; i++) {
      const client = this.clients[i];
      const rpcUrl = this.rpcUrls[i];
      try {
        const result = await client.getBalance({ address: address as `0x${string}` });
        trackRpcSuccess(this.chain.id, rpcUrl);
        return result;
      } catch (err) {
        trackRpcFailure(this.chain.id, rpcUrl, err);
        lastError = err;
        // Continue to next RPC
      }
    }
    throw lastError;
  }

  async getTokenBalances(address: string): Promise<TokenBalance[]> {
    // Token balance fetching requires a token list or indexer
    // For now we return an empty array — Li.Fi / Alchemy integration handles this
    if (!this.isValidAddress(address)) return [];
    return [];
  }

  async getTransactions(_address: string, _limit = 20): Promise<Transaction[]> {
    // Transaction history fetching requires an indexer (Alchemy, Moralis, etc.)
    // Handled by the /api/activity route
    return [];
  }

  isValidAddress(address: string): boolean {
    return isAddress(address);
  }

  formatNative(raw: bigint): string {
    return formatUnits(raw, this.chain.nativeCurrency.decimals);
  }
}
