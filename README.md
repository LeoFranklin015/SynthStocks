# SynthStocks

**Human-verified synthetic stock trading with on-chain compliance, powered by decentralized compute.**

SynthStocks is a multichain synthetic stock trading platform that brings compliant, permissionless access to tokenized equities. Users buy and sell fractional synthetic stocks using USDC — gated only by proof of personhood, not geography or paperwork.

## The Problem

Today's tokenized stock platforms issue real-world asset tokens but have no on-chain mechanism to verify *who* is buying them. There's no allowlisting — anyone with a wallet can accumulate unlimited tokens, creating regulatory blind spots around concentration risk and sybil abuse. Existing compliance is either fully centralized (KYC gatekeepers) or entirely absent.

## How SynthStocks Solves It

1. **Human-only access via World ID** — Every trader proves they are a unique human through a zero-knowledge biometric check. No personal data is shared, but sybil attacks are eliminated. One person, one verified identity, across all chains.

2. **On-chain compliance via holding limits** — The protocol enforces maximum holding percentages per token, preventing any single actor from accumulating an outsized position. Violations are automatically detected and flagged by decentralized compute.

3. **Decentralized compute via Chainlink CRE** — Real-time stock prices, cross-chain supply sync, verification propagation, and compliance monitoring all run through Chainlink's Compute Runtime Environment — no centralized infrastructure.

## Architecture

<img width="7476" height="3939" alt="image" src="https://github.com/user-attachments/assets/b69d5689-629f-4d45-8446-fc0ef5e1ee21" />

### Chains

Deployed on **Base Sepolia**, **Arbitrum Sepolia**, and **Avalanche Fuji** with identical contract addresses.

### Tokens

| Token | Stock | Supply Cap |
|-------|-------|-----------|
| sAAPL | Apple | 4,000 |
| sNVDA | NVIDIA | 5,000 |
| sTSLA | Tesla | 3,000 |
| sAMZN | Amazon | 4,000 |
| sMETA | Meta | 2,000 |
| sGOOG | Google | 5,000 |

### Smart Contracts

| Contract | Purpose |
|----------|---------|
| `MultiTokenExchange` | Central hub — handles verification, buy/sell, supply caps, holding limits. One per chain, shared by all tokens. |
| `BackedAutoFeeTokenImplementation` | ERC20 synthetic token with rebasing fee multiplier. Minting/burning controlled by Exchange. |
| `SynthStocksPriceReceiver` | Stores latest stock price (8 decimals). One per token per chain. Written to by CRE price-feed workflow. |
| `ExchangeOnlySanctionsList` | Blocks P2P token transfers — forces all trading through the Exchange. |

### Chainlink CRE Workflows

| Workflow | Trigger | What It Does |
|----------|---------|--------------|
| `price-feed` | Cron (30s) | Fetches live stock prices from Finnhub, writes to PriceReceiver contracts on all 3 chains |
| `supply-sync` | Buy/Sell event | Reads `totalSupply()` across all chains, computes per-chain `crossChainSupply`, writes back to enforce global supply cap |
| `verify-sync` | `UserVerified` event | Propagates World ID verification from one chain to all others — a single proof becomes a multichain trading passport |
| `holding-monitor` | `Transfer` event | Checks if any holder exceeds max holding %, flags/unflags on-chain for compliance |

### Flow

```
User → World ID (ZK proof) → CRE Backend → verifyOffchain() on 3 chains
User → Buy/Sell via USDC → MultiTokenExchange → mint/burn tokens
CRE price-feed → live prices → PriceReceiver → used by Exchange on buy/sell
CRE supply-sync → reads supply on 3 chains → enforces global cap
CRE verify-sync → propagates identity across chains
CRE holding-monitor → flags concentration risk on Transfer events
```

## Project Structure

```
chainlink-hack/
├── contracts/                  # Solidity smart contracts (Hardhat)
│   ├── contracts/              # Solidity source files
│   │   ├── MultiTokenExchange.sol
│   │   ├── SynthStocksPriceReceiver.sol
│   │   ├── BackedAutoFeeTokenImplementation.sol
│   │   ├── ExchangeOnlySanctionsList.sol
│   │   └── ...
│   ├── scripts/
│   │   └── cre-backend.js      # CRE workflow orchestrator + HTTP API
│   ├── deployed-unified.json   # Deployment addresses (all chains)
│   └── hardhat.config.js
│
├── cre/                        # Chainlink CRE workflows
│   ├── price-feed/             # Stock price oracle workflow
│   │   ├── workflow.ts         # CRE workflow logic
│   │   ├── config.{symbol}.json
│   │   └── workflow.yaml       # CRE workflow definition
│   ├── supply-sync/            # Cross-chain supply balancing
│   ├── verify-sync/            # Identity propagation
│   ├── holding-monitor/        # Compliance monitoring
│   ├── generate-configs.js     # Config generator from deployed addresses
│   └── project.yaml            # CRE project config
│
├── web/                        # Next.js frontend
│   ├── app/
│   │   ├── verify/             # World ID verification page
│   │   ├── assets/             # Token trading pages
│   │   └── api/                # API routes (allowlist proxy, verify)
│   ├── components/             # React components
│   └── config/                 # Chain + token configuration
│
└── subgraph/                   # Indexing (The Graph)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, Tailwind CSS, wagmi, viem |
| Smart Contracts | Solidity 0.8.9, Hardhat, OpenZeppelin |
| Wallet | Smart wallet (ERC-4337) with paymaster gas sponsoring |
| Identity | World ID v4 (zero-knowledge proof of personhood) |
| Oracles & Compute | Chainlink CRE (price feeds, cross-chain sync, compliance) |
| Market Data | Finnhub API |
| Chains | Base Sepolia, Arbitrum Sepolia, Avalanche Fuji |

## Getting Started

### Contracts

```bash
cd contracts
npm install
cp .env.example .env  # Add PRIVATE_KEY
npx hardhat compile
```

### CRE Backend

```bash
cd contracts
node scripts/cre-backend.js
```

This starts the CRE workflow orchestrator which:
- Runs price-feed updates every 30s per token
- Listens for Buy/Sell events to trigger supply-sync
- Listens for UserVerified events to trigger verify-sync
- Serves the `/allowlist` HTTP API on port 3100

### Frontend

```bash
cd web
npm install
cp .env.example .env.local  # Add World ID + RPC config
npm run dev
```

## Key Contract Addresses

See `contracts/deployed-unified.json` for all token and price feed addresses.

## License

MIT
