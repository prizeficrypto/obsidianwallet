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
  valueFormatted: string;
  valueUSD?: number;
  token?: {
    symbol: string;
    address: string;
    decimals: number;
  };
  timestamp: number;
  blockNumber?: bigint;
  gasUsed?: string;
  gasPrice?: string;
  feeUSD?: number;
}
