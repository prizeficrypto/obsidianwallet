/**
 * Curated token list for World Chain (chainId 480).
 * Includes only tokens supported for swapping via Uniswap V3/V4 or Universal Protocol.
 */

export interface CuratedToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoURI: string;
}

export const WORLD_CHAIN_TOKENS: CuratedToken[] = [
  // ── World Chain native assets ─────────────────────────────────────────────
  {
    address: "0x2cFc85d8E48F8EAB294be644d9E25C3030863003",
    symbol: "WLD",
    name: "Worldcoin",
    decimals: 18,
    chainId: 480,
    logoURI: "https://assets.coingecko.com/coins/images/31069/small/worldcoin.jpeg",
  },

  // ── Stablecoins & core assets ─────────────────────────────────────────────
  {
    address: "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1",
    symbol: "USDC.e",
    name: "Bridged USDC",
    decimals: 6,
    chainId: 480,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
  },
  {
    address: "0x4200000000000000000000000000000000000006",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    chainId: 480,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
  },
  {
    address: "0x03C7054BCB39f7b2e5B2c7AcB37583e32D70Cfa3",
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    decimals: 8,
    chainId: 480,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png",
  },
  {
    address: "0x30974f73A4ac9E606Ed80da928e454977ac486D2",
    symbol: "oXAUt",
    name: "Tether Gold",
    decimals: 6,
    chainId: 480,
    logoURI: "https://assets.coingecko.com/coins/images/10481/small/Tether_Gold.png",
  },

  // ── Universal Protocol tokens ─────────────────────────────────────────────
  {
    address: "0x2615a94df961278DcbC41Fb0a54fEc5f10a693aE",
    symbol: "uXRP",
    name: "XRP (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  },
  {
    address: "0x9B8Df6E244526ab5F6e6400d331DB28C8fdDdb55",
    symbol: "uSOL",
    name: "Solana (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  },
  {
    address: "0x12E96C2BFEA6E835CF8Dd38a5834fa61Cf723736",
    symbol: "uDOGE",
    name: "Dogecoin (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  },
  {
    address: "0xa3A34A0D9A08CCDDB6Ed422Ac0A28a06731335aA",
    symbol: "uADA",
    name: "Cardano (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI: "https://assets.coingecko.com/coins/images/975/small/cardano.png",
  },
  {
    address: "0xd403D1624DAEF243FbcBd4A80d8A6F36afFe32b2",
    symbol: "uLINK",
    name: "Chainlink (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png",
  },
  {
    address: "0x378c326A472915d38b2D8D41e1345987835FaB64",
    symbol: "uXLM",
    name: "Stellar (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI: "https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png",
  },
  {
    address: "0xb0505e5a99abd03d94a1169e638B78EDfEd26ea4",
    symbol: "uSUI",
    name: "Sui (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI: "https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg",
  },
  {
    address: "0x91B1b343aC321c0579Ed33854E20A98Ef881Cc89",
    symbol: "uBNB",
    name: "BNB (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  },
  {
    address: "0x3EB097375fc2FC361e4a472f5E7067238c547c52",
    symbol: "uLTC",
    name: "Litecoin (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI: "https://assets.coingecko.com/coins/images/2/small/litecoin.png",
  },
  {
    address: "0xd6a34b430C05ac78c24985f8abEE2616BC1788Cb",
    symbol: "uAVAX",
    name: "Avalanche (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  },
  {
    address: "0xc79e06860Aa9564f95E08fb7E5b61458d0C63898",
    symbol: "uHBAR",
    name: "Hedera (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI: "https://assets.coingecko.com/coins/images/3688/small/hbar.png",
  },
  {
    address: "0xf383074c4B993d1ccd196188d27D0dDf22AD463c",
    symbol: "uAAVE",
    name: "Aave (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9/logo.png",
  },
  {
    address: "0xE5c436B0a34DF18F1dae98af344Ca5122E7d57c4",
    symbol: "uPEPE",
    name: "Pepe (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI: "https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg",
  },
  {
    address: "0x90131D95a9a5b48b6a3eE0400807248bEcf4B7A4",
    symbol: "uONDO",
    name: "Ondo (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3/logo.png",
  },
  {
    address: "0x20fbd133897ef802e0235db77bb19a071e257d41",
    symbol: "uPUMP",
    name: "Pump (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI: "",
  },
];

// Quick lookup by address (lowercase)
export const TOKEN_MAP: Record<string, CuratedToken> = Object.fromEntries(
  WORLD_CHAIN_TOKENS.map((t) => [t.address.toLowerCase(), t])
);
