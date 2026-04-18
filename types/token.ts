/**
 * Unified token identity passed from asset list → token detail screen.
 * Covers both native chain tokens (ETH, BNB…) and ERC-20s (WLD).
 */
export interface SelectedToken {
  symbol: string;
  coingeckoId: string;
  /** For ERC-20 tokens — rendered with TokenIcon */
  logoURI?: string;
  /** For native tokens — rendered with ChainIcon (e.g. "ethereum", "world-chain") */
  chainIconId?: string;
  network: string;
  balance: number;
  balanceUSD: number;
  priceChange24h: number;
  explorerUrl: string;
  /** Present for ERC-20 tokens */
  contractAddress?: string;
}

export interface Token {
  address: string;               // "0x..." or "native" or base58 for Solana
  symbol: string;
  name: string;
  decimals: number;
  chainId: string;               // our chain ID string
  logoURI?: string;
  priceUSD?: number;
  isNative?: boolean;
  isVerified?: boolean;
}

export interface TokenPrice {
  symbol: string;
  priceUSD: number;
  change24h?: number;
  updatedAt: number;
}

export type PriceMap = Record<string, number>;   // symbol -> USD price
