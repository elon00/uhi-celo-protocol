const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log("================================================================");
  console.log("💎 APEX UNIVERSAL HIGH INCOME ($AUHI) - CELO MAINNET PRODUCTION");
  console.log("================================================================");
  console.log(`Deployer Address:     ${deployer.address}`);
  console.log(`Detected Chain ID:    ${network.chainId}`);

  if (Number(network.chainId) !== 42220) {
    console.warn(`\n⚠️  WARNING: Target is not Celo Mainnet (Expected Chain ID 42220, got ${network.chainId}).`);
    console.warn("To deploy to Celo Mainnet, run: npx hardhat run scripts/deploy-mainnet.js --network celo\n");
  }

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceCelo = hre.ethers.formatEther(balance);
  console.log(`Deployer CELO Balance: ${balanceCelo} CELO`);

  if (balance === 0n) {
    console.error("❌ ERROR: Deployer account has 0 CELO. Fund account before deploying to Celo Mainnet.");
    process.exit(1);
  }

  const feeData = await hre.ethers.provider.getFeeData();
  console.log(`Current Gas Price:     ${hre.ethers.formatUnits(feeData.gasPrice || 5000000000n, "gwei")} Gwei`);

  // 1. Deploy Post-Quantum Cryptography Vault
  console.log("\n[1/6] Deploying PQCQuantumVault...");
  const PQCQuantumVault = await hre.ethers.getContractFactory("PQCQuantumVault");
  const pqcVault = await PQCQuantumVault.deploy();
  await pqcVault.waitForDeployment();
  const pqcVaultAddress = await pqcVault.getAddress();
  console.log(`  -> PQCQuantumVault deployed at: ${pqcVaultAddress}`);

  // 2. Deploy Conway Automaton Engine
  console.log("\n[2/6] Deploying ConwayAutomatonEngine...");
  const ConwayAutomatonEngine = await hre.ethers.getContractFactory("ConwayAutomatonEngine");
  const initialSeed = "0x00001C000000070000003800000000000000E000000000000000000000000001";
  const conwayEngine = await ConwayAutomatonEngine.deploy(initialSeed);
  await conwayEngine.waitForDeployment();
  const conwayEngineAddress = await conwayEngine.getAddress();
  console.log(`  -> ConwayAutomatonEngine deployed at: ${conwayEngineAddress}`);

  // 3. Deploy ApexUHIToken
  console.log("\n[3/6] Deploying ApexUHIToken ($AUHI)...");
  const initialSupply = hre.ethers.parseEther("1000000000"); // 1B Genesis
  const ApexUHIToken = await hre.ethers.getContractFactory("ApexUHIToken");
  const uhiToken = await ApexUHIToken.deploy(
    "Apex Universal High Income",
    "AUHI",
    initialSupply,
    deployer.address,
    deployer.address
  );
  await uhiToken.waitForDeployment();
  const uhiTokenAddress = await uhiToken.getAddress();
  console.log(`  -> ApexUHIToken deployed at: ${uhiTokenAddress}`);

  // 4. Deploy UHIDividendDistributor
  console.log("\n[4/6] Deploying UHIDividendDistributor...");
  const UHIDividendDistributor = await hre.ethers.getContractFactory("UHIDividendDistributor");
  const dividendDistributor = await UHIDividendDistributor.deploy(uhiTokenAddress, conwayEngineAddress);
  await dividendDistributor.waitForDeployment();
  const distributorAddress = await dividendDistributor.getAddress();
  console.log(`  -> UHIDividendDistributor deployed at: ${distributorAddress}`);

  // 5. Deploy X402BazaarProtocol
  console.log("\n[5/6] Deploying X402BazaarProtocol...");
  const X402BazaarProtocol = await hre.ethers.getContractFactory("X402BazaarProtocol");
  const x402Bazaar = await X402BazaarProtocol.deploy(uhiTokenAddress, distributorAddress);
  await x402Bazaar.waitForDeployment();
  const bazaarAddress = await x402Bazaar.getAddress();
  console.log(`  -> X402BazaarProtocol deployed at: ${bazaarAddress}`);

  // 6. Deploy UHIAutomator
  console.log("\n[6/6] Deploying UHIAutomator...");
  const UHIAutomator = await hre.ethers.getContractFactory("UHIAutomator");
  const automator = await UHIAutomator.deploy(conwayEngineAddress, distributorAddress);
  await automator.waitForDeployment();
  const automatorAddress = await automator.getAddress();
  console.log(`  -> UHIAutomator deployed at: ${automatorAddress}`);

  // Role permissions
  console.log("\n[Config] Configuring Mainnet Roles & Permissions...");
  const MINTER_ROLE = await uhiToken.MINTER_ROLE();
  await (await uhiToken.grantRole(MINTER_ROLE, distributorAddress)).wait();

  const FEE_EXEMPT_ROLE = await uhiToken.FEE_EXEMPT_ROLE();
  await (await uhiToken.grantRole(FEE_EXEMPT_ROLE, distributorAddress)).wait();
  await (await uhiToken.grantRole(FEE_EXEMPT_ROLE, bazaarAddress)).wait();
  await (await uhiToken.setFeeExempt(distributorAddress, true)).wait();
  await (await uhiToken.setFeeExempt(bazaarAddress, true)).wait();
  await (await conwayEngine.setAutomator(automatorAddress)).wait();

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

  const manifest = {
    network: "celo",
    chainId: 42220,
    explorer: "https://celoscan.io",
    timestamp: new Date().toISOString(),
    contracts: {
      PQCQuantumVault: pqcVaultAddress,
      ConwayAutomatonEngine: conwayEngineAddress,
      ApexUHIToken: uhiTokenAddress,
      UHIDividendDistributor: distributorAddress,
      X402BazaarProtocol: bazaarAddress,
      UHIAutomator: automatorAddress,
    },
    verificationCommands: [
      `npx hardhat verify --network celo ${pqcVaultAddress}`,
      `npx hardhat verify --network celo ${conwayEngineAddress} "${initialSeed}"`,
      `npx hardhat verify --network celo ${uhiTokenAddress} "Apex Universal High Income" "AUHI" "${initialSupply}" "${deployer.address}" "${deployer.address}"`,
      `npx hardhat verify --network celo ${distributorAddress} "${uhiTokenAddress}" "${conwayEngineAddress}"`,
      `npx hardhat verify --network celo ${bazaarAddress} "${uhiTokenAddress}" "${distributorAddress}"`,
      `npx hardhat verify --network celo ${automatorAddress} "${conwayEngineAddress}" "${distributorAddress}"`,
    ],
  };

  fs.writeFileSync(path.join(deploymentsDir, "celo-mainnet.json"), JSON.stringify(manifest, null, 2));
  console.log("\n✅ CELO MAINNET DEPLOYMENT COMPLETE!");
  console.log(`Saved manifest to deployments/celo-mainnet.json`);
  console.log("================================================================");
}

main().catch((err) => {
  console.error("Mainnet deployment failed:", err);
  process.exit(1);
});
