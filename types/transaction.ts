export type TxStatus = "pending" | "success" | "failed" | "unknown";
export type TxType = "send" | "receive" | "swap" | "bridge" | "approve";

export interface Transaction {
  hash: string;
  type: TxType;
  status: TxStatus;
  chainId: string;
  from: string;
  to: string;
  value: string;                 // raw string amount
  valueFormatted: string;        // human-readable amount received / sent
  valueUSD?: number;
  token?: {
    symbol: string;
    address: string;
    decimals: number;
  };
  /** For swaps: the token that was spent (the "in" side). valueFormatted holds the "out" side. */
  tokenIn?: {
    symbol: string;
    address: string;
    decimals: number;
    valueFormatted: string;
  };
  timestamp: number;
  blockNumber?: bigint;
  gasUsed?: string;
  gasPrice?: string;
  feeUSD?: number;
}
