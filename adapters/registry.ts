import type { IChainAdapter } from "./types";
import { EvmAdapter } from "./evm/evmAdapter";
import { WorldChainAdapter } from "./evm/worldChainAdapter";
import { SolanaAdapter } from "./solana/solanaAdapter";
import { BitcoinAdapter } from "./bitcoin/bitcoinAdapter";
import { CHAINS } from "@/lib/chains/config";

const _registry = new Map<string, IChainAdapter>();

function buildRegistry(): Map<string, IChainAdapter> {
  const map = new Map<string, IChainAdapter>();

  map.set("world-chain", new WorldChainAdapter());
  map.set("solana", new SolanaAdapter());
  map.set("bitcoin", new BitcoinAdapter());

  // All other EVM chains
  for (const chain of CHAINS) {
    if (chain.chainType === "evm" && chain.id !== "world-chain") {
      map.set(chain.id, new EvmAdapter(chain));
    }
  }

  return map;
}

let registryCache: Map<string, IChainAdapter> | null = null;

export function getAdapterRegistry(): Map<string, IChainAdapter> {
  if (!registryCache) {
    registryCache = buildRegistry();
  }
  return registryCache;
}

export function getAdapter(chainId: string): IChainAdapter | undefined {
  return getAdapterRegistry().get(chainId);
}
