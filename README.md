# Apex Universal High Income Protocol ($AUHI)
> **Autonomous Post-Quantum Wealth & Agentic Micropayment Protocol on Celo L2**

[![Build & Test](https://img.shields.io/badge/Hardhat-Tests%20Passing-brightgreen)]()
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24%20(Cancun)-blue)]()
[![Network](https://img.shields.io/badge/Celo%20L2-ChainID%2042220-48D38A)]()
[![License](https://img.shields.io/badge/License-MIT-green)]()

---

## 🌟 Overview

**ApexUHI ($AUHI)** is a sovereign, reality-based economic operating system built natively on the **Celo L2 Blockchain** (OP Stack). It redefines the global economic transition from labor scarcity to autonomous machine abundance by delivering **Universal High Income (UHI)**.

Unlike legacy fixed-supply tokens or inflationary meme assets, ApexUHI combines:
1. **Algorithmic Elastic High-Income Distribution**: Continuous streaming dividends to verified stakers and global citizens.
2. **Conway Cellular Automaton Engine**: An on-chain 16x16 toroidal cellular matrix (Conway's Game of Life) that deterministically modulates dynamic emission yields based on decentralized economic vitality.
3. **x402 Bazaar Protocol**: Production implementation of the HTTP 402 ("Payment Required") agentic commerce rail. Autonomous AI agents pay in $AUHI for compute and inference, routing **20% of all machine revenue directly into human dividend pools** and burning **10% permanently**.
4. **Post-Quantum Cryptography (PQC) Security**: Lamport and Winternitz stateful hash-based signature verification protecting the protocol treasury from quantum algorithmic attacks.
5. **Dynamic Deflationary Sink**: Automated 0.30% transfer burn fee balancing elastic issuance with velocity.

---

## 🏛️ Smart Contract Architecture

```
apex-uhi-celo/
├── contracts/
│   ├── ApexUHIToken.sol            # Elastic ERC20/Permit token with 0.30% burn sink
│   ├── ConwayAutomatonEngine.sol   # On-chain 16x16 toroidal Game of Life engine
│   ├── UHIDividendDistributor.sol  # Streaming High-Income staking & dividend vault
│   ├── X402BazaarProtocol.sol      # Agentic HTTP 402 micropayment commerce rails
│   ├── PQCQuantumVault.sol         # Post-Quantum Lamport hash signature verifier
│   ├── UHIAutomator.sol            # Gelato / Chainlink keeper automation contract
│   └── interfaces/                 # Contract interfaces
├── scripts/
│   ├── deploy.js                   # Deployment & role wiring pipeline
│   ├── deploy-mainnet.js           # Production Celo Mainnet deployment script
│   ├── tick-conway-epoch.js        # On-chain cellular generation tick & ASCII visualizer
│   └── agent-x402-client.js        # Autonomous agent HTTP 402 payment client
├── ai-agent-sdk/
│   ├── python/                     # Python SDK (Web3 + Gemini Multimodal AI agent)
│   └── typescript/                 # TypeScript SDK (x402AgentClient)
├── test/
│   └── ApexUHI.test.js             # 12/12 passing comprehensive unit test suite
└── docs/
    ├── WHITEPAPER.md               # Technical whitepaper
    ├── TOKENOMICS.md               # Mathematical tokenomics breakdown
    ├── GLOBAL_MARKETING_STRATEGY.md# MiniPay & global GTM strategy
    └── DEPLOYMENT_GUIDE.md         # Deployment & verification guide
```

---

## 🚀 Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Comprehensive Reality Tests
```bash
npx hardhat test
```
All 12 unit tests pass covering tokenomics, burning sinks, cellular automaton state evolution, HTTP 402 splits, and post-quantum signatures:
```
  Apex Universal High Income (ApexUHI) Full Reality Test Suite
    1. ApexUHIToken Mechanics & Burn Sink
      ✓ should initialize with correct name, symbol and initial supply
      ✓ should apply 0.30% deflationary burn on non-exempt peer transfers
      ✓ should exempt protocol contracts from burn fees
    2. Conway Cellular Automaton Engine
      ✓ should count live cells correctly from bitmask
      ✓ should dynamically calculate yield multiplier based on cellular vitality
      ✓ should execute Conway's Game of Life toroidal next-generation step
      ✓ should allow automator to tick epoch when time elapsed
    3. x402 Bazaar Protocol (Agentic Micropayments)
      ✓ should register AI service correctly
      ✓ should execute real HTTP 402 payment, distribute 70% to provider, 20% to UHI, and burn 10%
    4. UHIDividendDistributor (Streaming High Income Vault)
      ✓ should allow staking and accumulate streaming rewards over time
    5. Post-Quantum Cryptography (PQC) Security Vault
      ✓ should register quantum public key root hash
      ✓ should execute quantum guarded action when Lamport hash preimage matches root

  12 passing (10s)
```

### 3. Run Live On-Chain Cellular Automaton Visualizer
```bash
npx hardhat run scripts/tick-conway-epoch.js
```
Renders the live 16x16 Conway cellular grid directly from on-chain storage and calculates dynamic high-income yield multipliers:
```
Current Epoch:       #1
Total Live Cells:    13 / 256
Yield Multiplier:    1.1014x (11014 BPS)
┌──────────────────────────────────┐
│    LIVE CONWAY CELLULAR GRID     │
├──────────────────────────────────┤
│  ■ · · · · · · · · · · · · · · · │
│  · · · · · · · · · · · · · · · · │
│  · · · · · · · · · · · · · ■ ■ ■ │
│  · · · · · · · · · · ■ ■ ■ · · · │
└──────────────────────────────────┘
```

### 4. Run Autonomous AI Agent HTTP 402 Payment Client
```bash
npx hardhat run scripts/agent-x402-client.js
```
Executes a real on-chain transaction purchasing AI inference in $AUHI, streaming dividends into the UHI pool and burning 10% permanently:
```
🎉 [x402 SUCCESS] Payment Processed in Block #7!
  -> Receipt Hash:        0xe9c14463d76cc867bd9ce49fa59ba6a4aed48f0cd498490344ce1ef2763c0b19
  -> Dividend Cut to UHI: 0.5 AUHI
  -> Burned Cut:          0.25 AUHI
```

---

## 🌐 Deployment to Celo

### Celo Alfajores Testnet
```bash
npx hardhat run scripts/deploy.js --network alfajores
```

### Celo Mainnet
```bash
npx hardhat run scripts/deploy-mainnet.js --network celo
```

---

## 📄 License
MIT © ApexUHI Foundation
