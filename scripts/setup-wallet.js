const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("================================================================");
  console.log("🔑 APEX UHI - 1-CLICK AUTOMATIC WALLET & PRIVATE KEY GENERATOR");
  console.log("================================================================");

  const envPath = path.join(__dirname, "..", ".env");
  const envExamplePath = path.join(__dirname, "..", ".env.example");

  let existingPrivateKey = null;

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(/PRIVATE_KEY=([^\r\n]+)/);
    if (match && match[1] && !match[1].includes("your_private_key")) {
      existingPrivateKey = match[1].trim();
    }
  }

  let wallet;

  if (existingPrivateKey && existingPrivateKey.length >= 64) {
    try {
      wallet = new ethers.Wallet(existingPrivateKey);
      console.log("⚡ Found existing active wallet in your .env file!");
    } catch {
      wallet = ethers.Wallet.createRandom();
      console.log("✨ Generated brand new fresh Celo wallet!");
    }
  } else {
    wallet = ethers.Wallet.createRandom();
    console.log("✨ Generated brand new fresh Celo wallet!");
  }

  const cleanPrivateKey = wallet.privateKey;
  const address = wallet.address;
  const mnemonic = wallet.mnemonic ? wallet.mnemonic.phrase : "N/A";

  // Build / Update .env content
  let envLines = [];
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, "utf-8");
    envLines = raw.split(/\r?\n/);
  } else if (fs.existsSync(envExamplePath)) {
    const raw = fs.readFileSync(envExamplePath, "utf-8");
    envLines = raw.split(/\r?\n/);
  } else {
    envLines = [
      "PRIVATE_KEY=",
      "CELOSCAN_API_KEY=",
      "CELO_MAINNET_RPC=https://forno.celo.org",
      "CELO_ALFAJORES_RPC=https://alfajores-forno.celo.org",
      "GEMINI_API_KEY="
    ];
  }

  let foundKey = false;
  const updatedLines = envLines.map((line) => {
    if (line.startsWith("PRIVATE_KEY=")) {
      foundKey = true;
      return `PRIVATE_KEY=${cleanPrivateKey}`;
    }
    return line;
  });

  if (!foundKey) {
    updatedLines.unshift(`PRIVATE_KEY=${cleanPrivateKey}`);
  }

  fs.writeFileSync(envPath, updatedLines.join("\n"));

  console.log("\n----------------------------------------------------------------");
  console.log(`✅ WALLET READY & SAVED TO .env AUTOMATICALLY!`);
  console.log("----------------------------------------------------------------");
  console.log(`📍 Public Celo Address: ${address}`);
  console.log(`🔐 Private Key:         ${cleanPrivateKey}`);
  if (mnemonic !== "N/A") {
    console.log(`📝 Secret Recovery:     ${mnemonic}`);
  }
  console.log("----------------------------------------------------------------");
  console.log("\n🚰 FREE TESTNET TOKENS (1-Click Faucet):");
  console.log(`👉 https://faucet.celo.org/alfajores`);
  console.log(`   (Paste your Celo Address above to get free test CELO)`);
  console.log("\n🔍 View on Celoscan Explorer:");
  console.log(`👉 https://celoscan.io/address/${address}`);
  console.log("================================================================\n");
}

main().catch(console.error);
