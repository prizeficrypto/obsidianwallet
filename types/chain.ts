export type ChainType = "evm" | "solana" | "bitcoin";

export interface Chain {
  id: string;                    // "world-chain", "ethereum", "solana", etc.
  name: string;
  shortName: string;
  chainType: ChainType;
  chainId?: number;              // EVM chain ID
  nativeCurrency: {
    symbol: string;
    name: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrl: string;
  iconColor: string;             // primary brand color for this chain
  isTestnet?: boolean;
  lifiChainId?: number;          // Li.Fi uses same as chainId for EVM
}

export interface ChainBalance {
  chain: Chain;
  nativeBalance: bigint;
  nativeBalanceFormatted: string;
  nativeBalanceUSD: number;
  tokens: TokenBalance[];
  totalUSD: number;
  isLoading?: boolean;
  error?: string;
}

export interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
  balanceFormatted: string;
  balanceUSD: number;
  logoURI?: string;
  priceUSD?: number;
  chain: Chain;
}
