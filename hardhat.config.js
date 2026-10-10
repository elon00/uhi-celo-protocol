require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";
const CELOSCAN_API_KEY = process.env.CELOSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    // Celo Alfajores Testnet
    alfajores: {
      url: process.env.CELO_ALFAJORES_RPC || "https://alfajores-forno.celo.org",
      accounts: [PRIVATE_KEY],
      chainId: 44787,
      gasPrice: 5000000000, // 5 Gwei
    },
    // Celo Mainnet (OP Stack L2)
    celo: {
      url: process.env.CELO_MAINNET_RPC || "https://forno.celo.org",
      accounts: [PRIVATE_KEY],
      chainId: 42220,
      gasPrice: 5000000000, // 5 Gwei
    },
  },
  etherscan: {
    apiKey: {
      alfajores: CELOSCAN_API_KEY,
      celo: CELOSCAN_API_KEY,
    },
    customChains: [
      {
        network: "alfajores",
        chainId: 44787,
        urls: {
          apiURL: "https://api-alfajores.celoscan.io/api",
          browserURL: "https://alfajores.celoscan.io",
        },
      },
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.celoscan.io/api",
          browserURL: "https://celoscan.io",
        },
      },
    ],
  },
};
