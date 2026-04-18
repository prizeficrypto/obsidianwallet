import type { IChainAdapter } from "../types";
import type { Chain, TokenBalance } from "@/types/chain";
import type { Transaction } from "@/types/transaction";
import { CHAIN_MAP } from "@/lib/chains/config";

/** Validate a Bitcoin address (P2PKH, P2SH, Bech32) */
function isValidBitcoinAddress(address: string): boolean {
  if (!address) return false;
  // P2PKH: starts with 1
  if (/^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) return true;
  // P2SH: starts with 3
  if (/^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) return true;
  // Bech32 (native segwit): starts with bc1
  if (/^bc1[a-z0-9]{6,87}$/.test(address)) return true;
  return false;
}

export class BitcoinAdapter implements IChainAdapter {
  chain: Chain;

  constructor() {
    const chain = CHAIN_MAP["bitcoin"];
    if (!chain) throw new Error("bitcoin not found in config");
    this.chain = chain;
  }

  async getNativeBalance(address: string): Promise<bigint> {
    if (!this.isValidAddress(address)) return BigInt(0);
    try {
      // Use mempool.space API for balance
      const res = await fetch(
        `https://mempool.space/api/address/${address}`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) return BigInt(0);
      const data = await res.json();
      // funded_txo_sum - spent_txo_sum = balance in satoshis
      const balance =
        (data?.chain_stats?.funded_txo_sum ?? 0) -
        (data?.chain_stats?.spent_txo_sum ?? 0);
      return BigInt(Math.max(0, balance));
    } catch {
      return BigInt(0);
    }
  }

  async getTokenBalances(_address: string): Promise<TokenBalance[]> {
    return []; // Bitcoin has no token standard
  }

  async getTransactions(_address: string, _limit = 20): Promise<Transaction[]> {
    return [];
  }

  isValidAddress(address: string): boolean {
    return isValidBitcoinAddress(address);
  }
}
