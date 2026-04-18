import type { IChainAdapter } from "../types";
import type { Chain, TokenBalance } from "@/types/chain";
import type { Transaction } from "@/types/transaction";
import { CHAIN_MAP } from "@/lib/chains/config";

/** Validate a base58 Solana address (simplified check) */
function isValidSolanaAddress(address: string): boolean {
  if (!address || address.length < 32 || address.length > 44) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
}

export class SolanaAdapter implements IChainAdapter {
  chain: Chain;

  constructor() {
    const chain = CHAIN_MAP["solana"];
    if (!chain) throw new Error("solana not found in config");
    this.chain = chain;
  }

  async getNativeBalance(address: string): Promise<bigint> {
    if (!this.isValidAddress(address)) return BigInt(0);
    try {
      const res = await fetch(this.chain.rpcUrls[0], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getBalance",
          params: [address, { commitment: "confirmed" }],
        }),
      });
      const data = await res.json();
      return BigInt(data?.result?.value ?? 0);
    } catch {
      return BigInt(0);
    }
  }

  async getTokenBalances(_address: string): Promise<TokenBalance[]> {
    // SPL token balance fetching can be added later via getTokenAccountsByOwner
    return [];
  }

  async getTransactions(_address: string, _limit = 20): Promise<Transaction[]> {
    return [];
  }

  isValidAddress(address: string): boolean {
    return isValidSolanaAddress(address);
  }
}
