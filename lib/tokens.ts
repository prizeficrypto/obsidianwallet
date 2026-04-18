/**
 * Curated token list for World Chain (chainId 480).
 *
 * Sources:
 *  - Universal Protocol official contract addresses (same across Base/Polygon/World/Katana)
 *  - Uniswap / CoinGecko token lists for WBTC, WETH, USDC.e
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
  // ── Stablecoins & core assets ─────────────────────────────────────────────
  {
    address: "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1",
    symbol: "USDC.e",
    name: "Bridged USDC",
    decimals: 6,
    chainId: 480,
    logoURI:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
  },
  {
    address: "0x4200000000000000000000000000000000000006",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
  },
  {
    address: "0x03C7054BCB39f7b2e5B2c7AcB37583e32D70Cfa3",
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    decimals: 8,
    chainId: 480,
    logoURI:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png",
  },
  {
    address: "0xDCC74175fB91F84326a95922aD4D95D1a20CD559",
    symbol: "oXAUt",
    name: "PAX Gold",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/9519/small/paxgold.png",
  },

  // ── Universal Protocol wrapped assets (all 18 decimals) ──────────────────
  {
    address: "0x2615a94df961278DcbC41Fb0a54fEc5f10a693aE",
    symbol: "uXRP",
    name: "XRP (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  },
  {
    address: "0x91B1b343aC321c0579Ed33854E20A98Ef881Cc89",
    symbol: "uBNB",
    name: "BNB (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  },
  {
    address: "0x9B8Df6E244526ab5F6e6400d331DB28C8fdDdb55",
    symbol: "uSOL",
    name: "Solana (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  },
  {
    address: "0x12E96C2BFEA6E835CF8Dd38a5834fa61Cf723736",
    symbol: "uDOGE",
    name: "Dogecoin (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  },
  {
    address: "0xa3A34A0D9A08CCDDB6Ed422Ac0A28a06731335aA",
    symbol: "uADA",
    name: "Cardano (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/975/small/cardano.png",
  },
  {
    address: "0xd403D1624DAEF243FbcBd4A80d8A6F36afFe32b2",
    symbol: "uLINK",
    name: "Chainlink (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png",
  },
  {
    address: "0x378c326A472915d38b2D8D41e1345987835FaB64",
    symbol: "uXLM",
    name: "Stellar (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png",
  },
  {
    address: "0x3EB097375fc2FC361e4a472f5E7067238c547c52",
    symbol: "uLTC",
    name: "Litecoin (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/2/small/litecoin.png",
  },
  {
    address: "0xd6a34b430C05ac78c24985f8abEE2616BC1788Cb",
    symbol: "uAVAX",
    name: "Avalanche (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  },
  {
    address: "0xb0505e5a99abd03d94a1169e638B78EDfEd26ea4",
    symbol: "uSUI",
    name: "Sui (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg",
  },
  {
    address: "0xc79e06860Aa9564f95E08fb7E5b61458d0C63898",
    symbol: "uHBAR",
    name: "Hedera (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/3688/small/hbar.png",
  },
  {
    address: "0x239b9C1F24F3423062B0d364796e07Ee905E9FcE",
    symbol: "uSHIB",
    name: "Shiba Inu (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/11939/small/shiba.png",
  },
  {
    address: "0xf653E8B6Fcbd2A63246c6B7722d1e9d819611241",
    symbol: "uCRO",
    name: "Cronos (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/7310/small/cro_token_logo.png",
  },
  {
    address: "0xFdCa15bd55F350a36E63C47661914d80411d2C22",
    symbol: "uTAO",
    name: "Bittensor (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/28452/small/ARUsPeNQ_400x400.jpeg",
  },
  {
    address: "0xfb3CB973B2a9e2E09746393C59e7FB0d5189d290",
    symbol: "uUNI",
    name: "Uniswap (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png",
  },
  {
    address: "0x0F813f4785b2360009F9aC9BF6121a85f109efc6",
    symbol: "uDOT",
    name: "Polkadot (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/12171/small/polkadot.png",
  },
  {
    address: "0x5ed25E305E08F58AFD7995EaC72563E6BE65A617",
    symbol: "uNEAR",
    name: "NEAR Protocol (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/10365/small/near.png",
  },
  {
    address: "0xf383074c4B993d1ccd196188d27D0dDf22AD463c",
    symbol: "uAAVE",
    name: "Aave (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9/logo.png",
  },
  {
    address: "0xE5c436B0a34DF18F1dae98af344Ca5122E7d57c4",
    symbol: "uPEPE",
    name: "Pepe (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg",
  },
  {
    address: "0x40318eE213227894b5316E5EC84f6a5caf3bBEDd",
    symbol: "uICP",
    name: "Internet Computer (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/14495/small/Internet_Computer_logo.png",
  },
  {
    address: "0x90131D95a9a5b48b6a3eE0400807248bEcf4B7A4",
    symbol: "uONDO",
    name: "Ondo (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3/logo.png",
  },
  {
    address: "0x3a51f2a377EA8B55FAf3c671138A00503B031Af3",
    symbol: "uALGO",
    name: "Algorand (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/4380/small/download.png",
  },
  {
    address: "0xa260BA5fd9FF3FaE55Ac4930165A9C33519dE694",
    symbol: "uRNDR",
    name: "Render (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/11636/small/rndr.png",
  },
  {
    address: "0x7077C71B4AF70737a08287E279B717Dcf64fdC57",
    symbol: "uPOLL",
    name: "PoolTogether",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://storage.googleapis.com/zapper-fi-assets/tokens/worldchain/0x7077c71b4af70737a08287e279b717dcf64fdc57.png",
  },
  {
    address: "0x893ADcbdC7FcfA0eBb6d3803f01Df1eC199Bf7C5",
    symbol: "uQNT",
    name: "Quant (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/3370/small/5ZOu7brX_400x400.jpg",
  },
  {
    address: "0x6e934283DaE5D5D1831cbE8d557c44c9B83F30Ee",
    symbol: "uATOM",
    name: "Cosmos (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png",
  },
  {
    address: "0x9c0e042d65a2e1fF31aC83f404E5Cb79F452c337",
    symbol: "uAPT",
    name: "Aptos (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/26455/small/aptos_round.png",
  },
  {
    address: "0xdf5913632251585a55970134Fad8A774628E9388",
    symbol: "uFIL",
    name: "Filecoin (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/12817/small/filecoin.png",
  },
  {
    address: "0xD01CB4171A985571dEFF48c9dC2F6E153A244d64",
    symbol: "uARB",
    name: "Arbitrum (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg",
  },
  {
    address: "0xED1A31BB946F0B86Cf9d34A1c90546Ca75b091b0",
    symbol: "uFLR",
    name: "Flare (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://coin-images.coingecko.com/coins/images/28624/large/FLR-icon200x200.png?1696527609",
  },
  {
    address: "0x8CCf84dE79dF699A373421C769f1900Aa71200B0",
    symbol: "uTRUMP",
    name: "TRUMP (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://coin-images.coingecko.com/coins/images/53746/large/trump.png?1737171561",
  },
  {
    address: "0x20fbd133897ef802e0235db77bb19a071e257d41",
    symbol: "uPUMP",
    name: "Pump (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI: "",
  },
  {
    address: "0xf56Ce53561a9cc084e094952232bBfE1e5fb599e",
    symbol: "uBONK",
    name: "Bonk (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/28600/small/bonk.jpg",
  },
  {
    address: "0xdef3369Cb0B783a5F8Ee93aaF9674ddE53C3CE2a",
    symbol: "uPENGU",
    name: "Pudgy Penguins (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://coin-images.coingecko.com/coins/images/52622/large/PUDGY_PENGUINS_PENGU_PFP.png?1733809110",
  },
  {
    address: "0x8c655CA4FE20C089d7D6823afD17ED6A377296E3",
    symbol: "uMON",
    name: "Monad (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI: "",
  },
  {
    address: "0x71a67215a2025F501f386A49858A9ceD2FC0249d",
    symbol: "uSEI",
    name: "Sei (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/28205/small/Sei_Logo_-_Transparent.png",
  },
  {
    address: "0xDB18Fb11Db1b972A54bD89cE04bAd61855c07788",
    symbol: "uINJ",
    name: "Injective (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png",
  },
  {
    address: "0x2198b777D5Cb8CD5Aa01d5C4d70f8F28fED9BC05",
    symbol: "uOP",
    name: "Optimism (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
  },
  {
    address: "0x6a2ed50496495f087cac3ae1aea3d540ad79ef28",
    symbol: "uFARTCOIN",
    name: "Fartcoin (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://coin-images.coingecko.com/coins/images/50891/large/fart.jpg?1729503972",
  },
  {
    address: "0x17f8d5Aa7779094c32536fEcb177f93B33b3C3e2",
    symbol: "uWIF",
    name: "dogwifhat (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://coin-images.coingecko.com/coins/images/33566/large/dogwifhat.jpg?1702499428",
  },
  {
    address: "0xf081701aF06a8d4EcF159C9C178b5cA6A78B5548",
    symbol: "uIP",
    name: "Story (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://coin-images.coingecko.com/coins/images/54035/large/Transparent_bg.png?1738075331",
  },
  {
    address: "0x3c07eF1bD575B5f5b1ffCb868353f5BC501ed482",
    symbol: "u1INCH",
    name: "1inch (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://assets.coingecko.com/coins/images/13469/small/1inch-token.png",
  },
  {
    address: "0x6814e4BE03aEB33fe135Fe0e85CA6b0A03247519",
    symbol: "uPNUT",
    name: "Peanut the Squirrel (Universal)",
    decimals: 18,
    chainId: 480,
    logoURI:
      "https://coin-images.coingecko.com/coins/images/51301/large/Peanut_the_Squirrel.png?1734941241",
  },
];

// Quick lookup by address (lowercase)
export const TOKEN_MAP: Record<string, CuratedToken> = Object.fromEntries(
  WORLD_CHAIN_TOKENS.map((t) => [t.address.toLowerCase(), t])
);
