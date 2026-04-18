import type { Chain, TokenBalance } from "@/types/chain";
import type { Transaction } from "@/types/transaction";

export interface IChainAdapter {
  chain: Chain;

  /** Fetch native token balance for an address */
  getNativeBalance(address: string): Promise<bigint>;

  /** Fetch ERC-20 / SPL / other token balances */
  getTokenBalances(address: string): Promise<TokenBalance[]>;

  /** Fetch recent transactions */
  getTransactions(address: string, limit?: number): Promise<Transaction[]>;

  /** Check if address format is valid for this chain */
  isValidAddress(address: string): boolean;
}
