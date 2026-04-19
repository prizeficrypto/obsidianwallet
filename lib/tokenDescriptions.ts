/**
 * Short "About" descriptions for every token available on Obsidian / World Chain.
 * Keyed by CoinGecko ID. Used in the token detail screen.
 */

export interface TokenDescription {
  title: string;     // 1 short tagline
  body: string;      // 2-4 sentences
  tags: string[];    // e.g. ["Layer 1", "PoS", "Smart contracts"]
}

export const TOKEN_DESCRIPTIONS: Record<string, TokenDescription> = {
  "worldcoin-wld": {
    title: "Proof-of-humanity meets digital money",
    body: "Worldcoin is a protocol that proves you're a unique human using iris biometrics through its Orb device, issuing a privacy-preserving World ID credential. WLD is the native token of the ecosystem, distributed to verified users and used for governance. The project, co-founded by Sam Altman, aims to create an AI-age universal basic income. World Chain is its dedicated Layer-2 blockchain, granting verified humans free daily gas.",
    tags: ["Identity", "Governance", "OP Stack L2"],
  },

  "ethereum": {
    title: "The world's programmable money",
    body: "Ether (ETH) is the native currency of Ethereum — the leading smart-contract platform — and of World Chain, an OP Stack Layer-2 built on Ethereum's security. ETH is used to pay for transaction fees (gas) across both networks and is the backbone of the DeFi, NFT, and token ecosystems. World Chain inherits Ethereum's security while offering faster and cheaper transactions for its users.",
    tags: ["Layer 2", "OP Stack", "Gas token"],
  },

  "usd-coin": {
    title: "The dollar, on-chain",
    body: "USDC.e is a bridged version of USD Coin on World Chain, issued by Circle and backed 1:1 by US dollars and short-term US treasuries. It is the most widely used stablecoin for DeFi trading, lending, and payments. As the primary stablecoin on World Chain, USDC.e serves as the main quote currency for swaps on Uniswap V3.",
    tags: ["Stablecoin", "USD-pegged", "Circle"],
  },

  "wrapped-bitcoin": {
    title: "Bitcoin's value, DeFi-ready",
    body: "Wrapped Bitcoin (WBTC) is an ERC-20 token backed 1:1 by real Bitcoin held in custody, bridged to World Chain from Ethereum. It lets Bitcoin holders access DeFi liquidity pools and lending markets without selling their BTC. Custody of the underlying Bitcoin is managed by regulated institutional custodians.",
    tags: ["Bitcoin", "Wrapped asset", "DeFi"],
  },

  "tether-gold": {
    title: "Physical gold, tokenized on-chain",
    body: "Tether Gold (oXAUt) is a gold-backed digital asset where each token represents one troy ounce of physical gold stored in professional vault facilities. It is issued by Tether and provides a way to hold real gold exposure without needing physical storage. oXAUt combines the inflation-hedging properties of gold with the programmability of blockchain assets.",
    tags: ["Real-world asset", "Gold", "Store of value"],
  },

  "ripple": {
    title: "Cross-border payments at internet speed",
    body: "XRP is the native digital asset of the XRP Ledger, a decentralized blockchain built for fast and low-cost international payments. Transactions settle in 3-5 seconds with fees as low as fractions of a cent, making it a preferred rail for financial institutions and remittance services. uXRP on World Chain is a Universal Protocol-wrapped version, tradeable within World Chain's DeFi ecosystem.",
    tags: ["Payments", "Universal Protocol", "Wrapped"],
  },

  "solana": {
    title: "High-throughput blockchain for mass adoption",
    body: "Solana is a Layer-1 blockchain capable of processing tens of thousands of transactions per second using its Proof of History consensus mechanism. Known for its low fees and fast finality, it has become a hub for DeFi, NFTs, and consumer crypto applications like pump.fun. uSOL on World Chain is a Universal Protocol-wrapped token backed 1:1 by SOL.",
    tags: ["Layer 1", "High performance", "Universal Protocol"],
  },

  "dogecoin": {
    title: "The original meme coin, now a cultural icon",
    body: "Dogecoin launched in 2013 as a lighthearted parody of Bitcoin, featuring the iconic Shiba Inu 'Doge' meme. Despite its origins, it grew into one of crypto's most recognized assets, driven by a passionate community and high-profile endorsements. DOGE uses a Scrypt proof-of-work algorithm with an inflationary supply model. uDOGE on World Chain is backed 1:1 via Universal Protocol.",
    tags: ["Meme coin", "PoW", "Universal Protocol"],
  },

  "cardano": {
    title: "Peer-reviewed blockchain built for the long run",
    body: "Cardano is a proof-of-stake Layer-1 blockchain developed by IOHK, built on a foundation of peer-reviewed academic research and formal software verification. Its Ouroboros consensus protocol is designed for energy efficiency and long-term security. ADA powers transaction fees, governance, and staking rewards on the Cardano network. uADA on World Chain is backed 1:1 via Universal Protocol.",
    tags: ["Layer 1", "PoS", "Universal Protocol"],
  },

  "chainlink": {
    title: "The internet of smart contracts",
    body: "Chainlink is the leading decentralized oracle network, connecting blockchain smart contracts to real-world data, APIs, and off-chain computation. Its Price Feeds are the standard data source used by most DeFi protocols including Aave, Compound, and Synthetix. LINK tokens are used to compensate node operators who deliver accurate, tamper-resistant data on-chain. uLINK is backed 1:1 via Universal Protocol.",
    tags: ["Oracle", "Infrastructure", "Universal Protocol"],
  },

  "stellar": {
    title: "Global financial infrastructure for everyone",
    body: "Stellar is an open-source payment network focused on fast, low-cost cross-border money transfers, particularly for underserved markets. Its consensus mechanism achieves 3-5 second settlement with near-zero fees, and the network powers several regulated stablecoin and CBDC projects. XLM (Lumens) is the native asset used for fees and minimum account balances. uXLM is backed 1:1 via Universal Protocol.",
    tags: ["Payments", "Financial inclusion", "Universal Protocol"],
  },

  "sui": {
    title: "Built for a billion users, from day one",
    body: "Sui is a Layer-1 blockchain developed by Mysten Labs (former Meta engineers) using the Move programming language, enabling parallel transaction execution for high throughput. Its object-centric data model and zkLogin feature make it particularly developer-friendly for consumer applications. SUI is used for gas fees, staking, and governance. uSUI is backed 1:1 via Universal Protocol.",
    tags: ["Layer 1", "Move language", "Universal Protocol"],
  },

  "binancecoin": {
    title: "Powering the world's largest crypto ecosystem",
    body: "BNB is the native token of the BNB Chain ecosystem and the Binance exchange, originally launched as a utility token for trading fee discounts. Today it powers gas fees on BNB Smart Chain, governance in the BNB DAO, and serves as the base currency for thousands of dApps. It's consistently one of the top 5 crypto assets by market cap. uBNB is backed 1:1 via Universal Protocol.",
    tags: ["Exchange token", "BNB Chain", "Universal Protocol"],
  },

  "litecoin": {
    title: "Silver to Bitcoin's gold",
    body: "Litecoin is one of the earliest Bitcoin alternatives, launched in 2011 by Charlie Lee with faster 2.5-minute block times and the Scrypt hashing algorithm for broader mining accessibility. It's designed as a peer-to-peer digital currency for everyday payments and has one of crypto's longest track records. uLTC on World Chain is backed 1:1 via Universal Protocol.",
    tags: ["PoW", "Payments", "Universal Protocol"],
  },

  "avalanche-2": {
    title: "Blazing fast finality, infinitely scalable",
    body: "Avalanche is a Layer-1 blockchain with a unique multi-chain architecture — featuring the X-Chain, C-Chain, and P-Chain — and sub-second transaction finality through its Avalanche consensus protocol. It supports EVM-compatible smart contracts and allows anyone to launch custom application-specific subnets. AVAX is used for fees, staking, and creating new subnets. uAVAX is backed 1:1 via Universal Protocol.",
    tags: ["Layer 1", "Multi-chain", "Universal Protocol"],
  },

  "hedera-hashgraph": {
    title: "Enterprise-grade blockchain governed by global giants",
    body: "Hedera is a public distributed ledger using the hashgraph consensus algorithm — a DAG-based alternative to blockchain that achieves high throughput and fairness. It is governed by a council of marquee enterprises including Google, IBM, Boeing, and LG. HBAR is used for transaction fees, smart contract execution, and securing the network through staking. uHBAR is backed 1:1 via Universal Protocol.",
    tags: ["Hashgraph", "Enterprise", "Universal Protocol"],
  },

  "aave": {
    title: "The money market of DeFi",
    body: "Aave is one of the largest decentralized lending and borrowing protocols, where users deposit assets to earn yield or borrow against collateral without intermediaries. It pioneered flash loans — uncollateralized loans that must be repaid within a single transaction. AAVE is the governance token, allowing holders to vote on protocol parameters and stake in the Safety Module for protocol rewards. uAAVE is backed 1:1 via Universal Protocol.",
    tags: ["DeFi", "Lending", "Universal Protocol"],
  },

  "pepe": {
    title: "The meme that became a movement",
    body: "PEPE is a deflationary meme coin launched on Ethereum in April 2023, inspired by the iconic Pepe the Frog internet meme. It surged to multi-billion dollar market cap in weeks, becoming one of the fastest-growing meme tokens in crypto history. PEPE has no official utility — its value is driven entirely by community sentiment and speculative demand. uPEPE on World Chain is backed 1:1 via Universal Protocol.",
    tags: ["Meme coin", "Ethereum", "Universal Protocol"],
  },

  "ondo-finance": {
    title: "Real-world assets, on-chain",
    body: "Ondo Finance is a DeFi protocol specializing in tokenized real-world assets (RWAs), including US Treasury bonds (OUSG) and money market funds (USDY), bringing institutional-grade yields on-chain. It bridges the gap between traditional finance and DeFi, offering regulated and audited products. ONDO is the governance token for the Ondo DAO. uONDO on World Chain is backed 1:1 via Universal Protocol.",
    tags: ["RWA", "Tokenized assets", "Universal Protocol"],
  },

  "pump-fun": {
    title: "Where memes launch and trade instantly",
    body: "pump.fun is a Solana-based meme token launchpad that allows anyone to create and immediately trade a new token with zero coding required and built-in bonding curve liquidity. It became one of the most active dApps in all of crypto, launching thousands of tokens per day. The PUMP token represents the platform's native asset. uPUMP on World Chain is backed 1:1 via Universal Protocol.",
    tags: ["Meme launchpad", "Solana", "Universal Protocol"],
  },
};
