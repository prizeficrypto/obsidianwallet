"use client";

import { useState } from "react";

interface ChainIconProps {
  chainId: string;
  size?: number;
  className?: string;
}

const CHAIN_LOGOS: Record<string, { url: string; bg: string }> = {
  // World Chain is an Ethereum L2 — its native gas token is ETH, so the
  // token identity icon is the Ethereum logo, not the WLD/Worldcoin token logo.
  "world-chain": {
    url: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    bg: "#1B1B3A",
  },
  ethereum: {
    url: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    bg: "#1B1B3A",
  },
  solana: {
    url: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    bg: "#0D0D1F",
  },
  bitcoin: {
    url: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    bg: "#2C1A00",
  },
  bnb: {
    url: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    bg: "#1a1500",
  },
  polygon: {
    url: "https://assets.coingecko.com/coins/images/4713/large/polygon.png",
    bg: "#1A1028",
  },
  avalanche: {
    url: "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png",
    bg: "#1A0505",
  },
  arbitrum: {
    url: "https://assets.coingecko.com/coins/images/16547/large/photo_2023-03-29_21.47.00.jpeg",
    bg: "#0A1F2E",
  },
  base: {
    url: "https://assets.coingecko.com/asset_platforms/images/131/large/base-network.png",
    bg: "#001433",
  },
  optimism: {
    url: "https://assets.coingecko.com/coins/images/25244/large/Optimism.png",
    bg: "#1A0005",
  },
};

function proxyUrl(url: string) {
  return `/api/icon?url=${encodeURIComponent(url)}`;
}

export default function ChainIcon({ chainId, size = 44, className = "" }: ChainIconProps) {
  const [failed, setFailed] = useState(false);
  const config = CHAIN_LOGOS[chainId];

  const label = chainId.slice(0, 2).toUpperCase();
  const bg = config?.bg ?? "#1e1e1e";

  if (!config || failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-full flex-shrink-0 font-bold ${className}`}
        style={{ width: size, height: size, background: bg, fontSize: size * 0.28, color: "rgba(255,255,255,0.7)" }}
      >
        {label}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full flex-shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size, background: config.bg }}
    >
      <img
        src={proxyUrl(config.url)}
        alt={chainId}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        style={{ objectFit: "cover", width: size, height: size }}
      />
    </div>
  );
}

// Token icon — uses a logoURI directly with same styled wrapper
interface TokenIconProps {
  logoURI?: string;
  symbol: string;
  size?: number;
  bg?: string;
}

export function TokenIcon({ logoURI, symbol, size = 44, bg = "#1e1e1e" }: TokenIconProps) {
  const [failed, setFailed] = useState(false);

  if (!logoURI || failed) {
    return (
      <div
        className="flex items-center justify-center rounded-full flex-shrink-0 font-bold text-white/70"
        style={{ width: size, height: size, background: bg, fontSize: size * 0.28 }}
      >
        {symbol.slice(0, 2)}
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full flex-shrink-0 overflow-hidden"
      style={{ width: size, height: size, background: bg }}
    >
      <img
        src={proxyUrl(logoURI)}
        alt={symbol}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        style={{ objectFit: "cover", width: size, height: size }}
      />
    </div>
  );
}
