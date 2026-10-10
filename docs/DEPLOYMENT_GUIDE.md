# ApexUHI: Celo Mainnet & Alfajores Deployment Guide

---

## 1. Network Parameters

| Parameter | Celo Alfajores (Testnet) | Celo Mainnet (OP Stack L2) |
|---|---|---|
| **Chain ID** | `44787` | `42220` |
| **RPC Endpoint** | `https://alfajores-forno.celo.org` | `https://forno.celo.org` |
| **Block Explorer**| `https://alfajores.celoscan.io` | `https://celoscan.io` |
| **Native Gas Token** | CELO (Testnet) | CELO (or cUSD / USDT via CIP-64) |
| **Faucet** | `https://faucet.celo.org/alfajores` | N/A (Exchange or Bridge) |

---

## 2. Environment Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your environment variables:
```env
PRIVATE_KEY=your_private_key_without_0x
CELOSCAN_API_KEY=your_celoscan_api_key
CELO_MAINNET_RPC=https://forno.celo.org
CELO_ALFAJORES_RPC=https://alfajores-forno.celo.org
GEMINI_API_KEY=your_gemini_api_key
```

---

## 3. Pre-Flight Verification & Automated Testing

Always verify that all 12 smart contract unit tests pass before deploying:
```bash
npm run test
```

Expected result:
```
  Apex Universal High Income (ApexUHI) Full Reality Test Suite
  ...
  12 passing (10s)
```

---

## 4. Deploying to Celo Alfajores Testnet

Execute the automated deployment pipeline:
```bash
npm run deploy:alfajores
```

The script will deploy:
1. `PQCQuantumVault`
2. `ConwayAutomatonEngine`
3. `ApexUHIToken`
4. `UHIDividendDistributor`
5. `X402BazaarProtocol`
6. `UHIAutomator`

And automatically configure all roles (`MINTER_ROLE`, `FEE_EXEMPT_ROLE`, automator permissions) and save the output to `deployments/44787.json`.

---

## 5. Deploying to Celo Mainnet (Production)

Ensure your deployer account has at least 1.0 CELO for gas:
```bash
npm run deploy:mainnet
```

The production deployment manifest will be written to `deployments/celo-mainnet.json` including individual Celoscan verification commands.

### Verifying on Celoscan:
```bash
npx hardhat verify --network celo <DEPLOYED_CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

---

## 6. Post-Deployment Keeper Automation

To keep the Conway Automaton evolving and streaming high-income distributions 24/7:
1. **Gelato Automate**: Create a Gelato task pointing to `UHIAutomator.performUpkeep()`, triggered when `checkUpkeep()` returns true.
2. **Chainlink Automation**: Register a new custom logic upkeep on Celo using the `UHIAutomator` address.
3. **Autonomous Agent Keeper**: Run the Python/TypeScript daemon:
   ```bash
   python ai-agent-sdk/python/uhi_multimodal_agent.py
   ```
