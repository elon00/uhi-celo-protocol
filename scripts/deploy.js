const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log("==================================================");
  console.log("🚀 DEPLOYING APEX UNIVERSAL HIGH INCOME ($AUHI)");
  console.log("==================================================");
  console.log(`Deployer Address: ${deployer.address}`);
  console.log(`Network Name:     ${network.name}`);
  console.log(`Chain ID:         ${network.chainId}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Deployer Balance: ${hre.ethers.formatEther(balance)} CELO/ETH\n`);

  // 1. Deploy Post-Quantum Cryptography Vault
  console.log("[1/6] Deploying PQCQuantumVault...");
  const PQCQuantumVault = await hre.ethers.getContractFactory("PQCQuantumVault");
  const pqcVault = await PQCQuantumVault.deploy();
  await pqcVault.waitForDeployment();
  const pqcVaultAddress = await pqcVault.getAddress();
  console.log(`  -> PQCQuantumVault deployed at: ${pqcVaultAddress}`);

  // 2. Deploy Conway Automaton Engine
  console.log("\n[2/6] Deploying ConwayAutomatonEngine (Game of Life Cellular Matrix)...");
  const ConwayAutomatonEngine = await hre.ethers.getContractFactory("ConwayAutomatonEngine");
  // Seed with classic Glider + Blinker pattern
  const initialSeed = "0x00001C000000070000003800000000000000E000000000000000000000000001";
  const conwayEngine = await ConwayAutomatonEngine.deploy(initialSeed);
  await conwayEngine.waitForDeployment();
  const conwayEngineAddress = await conwayEngine.getAddress();
  console.log(`  -> ConwayAutomatonEngine deployed at: ${conwayEngineAddress}`);

  // 3. Deploy ApexUHIToken
  console.log("\n[3/6] Deploying ApexUHIToken ($AUHI)...");
  const initialSupply = hre.ethers.parseEther("1000000000"); // 1 Billion AUHI genesis supply
  const ApexUHIToken = await hre.ethers.getContractFactory("ApexUHIToken");
  const uhiToken = await ApexUHIToken.deploy(
    "Apex Universal High Income",
    "AUHI",
    initialSupply,
    deployer.address, // Admin
    deployer.address  // Genesis Treasury
  );
  await uhiToken.waitForDeployment();
  const uhiTokenAddress = await uhiToken.getAddress();
  console.log(`  -> ApexUHIToken ($AUHI) deployed at: ${uhiTokenAddress}`);

  // 4. Deploy UHIDividendDistributor
  console.log("\n[4/6] Deploying UHIDividendDistributor (Streaming High Income Vault)...");
  const UHIDividendDistributor = await hre.ethers.getContractFactory("UHIDividendDistributor");
  const dividendDistributor = await UHIDividendDistributor.deploy(uhiTokenAddress, conwayEngineAddress);
  await dividendDistributor.waitForDeployment();
  const distributorAddress = await dividendDistributor.getAddress();
  console.log(`  -> UHIDividendDistributor deployed at: ${distributorAddress}`);

  // 5. Deploy X402BazaarProtocol
  console.log("\n[5/6] Deploying X402BazaarProtocol (Agentic Micropayment Rails)...");
  const X402BazaarProtocol = await hre.ethers.getContractFactory("X402BazaarProtocol");
  const x402Bazaar = await X402BazaarProtocol.deploy(uhiTokenAddress, distributorAddress);
  await x402Bazaar.waitForDeployment();
  const bazaarAddress = await x402Bazaar.getAddress();
  console.log(`  -> X402BazaarProtocol deployed at: ${bazaarAddress}`);

  // 6. Deploy UHIAutomator
  console.log("\n[6/6] Deploying UHIAutomator (Keeper & Epoch Trigger)...");
  const UHIAutomator = await hre.ethers.getContractFactory("UHIAutomator");
  const automator = await UHIAutomator.deploy(conwayEngineAddress, distributorAddress);
  await automator.waitForDeployment();
  const automatorAddress = await automator.getAddress();
  console.log(`  -> UHIAutomator deployed at: ${automatorAddress}`);

  // Configuration & Role Bindings
  console.log("\n--------------------------------------------------");
  console.log("⚙️  CONFIGURING PROTOCOL ROLES & REVENUE FLOWS...");
  console.log("--------------------------------------------------");

  // Grant MINTER_ROLE to dividend distributor
  const MINTER_ROLE = await uhiToken.MINTER_ROLE();
  let tx = await uhiToken.grantRole(MINTER_ROLE, distributorAddress);
  await tx.wait();
  console.log("  ✓ Granted MINTER_ROLE to UHIDividendDistributor");

  // Whitelist fee exemptions for internal protocol mechanics
  const FEE_EXEMPT_ROLE = await uhiToken.FEE_EXEMPT_ROLE();
  tx = await uhiToken.grantRole(FEE_EXEMPT_ROLE, distributorAddress);
  await tx.wait();
  tx = await uhiToken.grantRole(FEE_EXEMPT_ROLE, bazaarAddress);
  await tx.wait();
  await uhiToken.setFeeExempt(distributorAddress, true);
  await uhiToken.setFeeExempt(bazaarAddress, true);
  console.log("  ✓ Whitelisted protocol contracts from burn fees");

  // Set automator in Conway Engine
  tx = await conwayEngine.setAutomator(automatorAddress);
  await tx.wait();
  console.log("  ✓ Authorized UHIAutomator in ConwayAutomatonEngine");

  // Register Genesis AI Services on x402 Bazaar
  console.log("\n--------------------------------------------------");
  console.log("🤖 REGISTERING GENESIS AI SERVICES ON x402 BAZAAR...");
  console.log("--------------------------------------------------");
  const callPrice1 = hre.ethers.parseEther("0.5"); // 0.5 AUHI per inference call
  tx = await x402Bazaar.registerService(
    "Multimodal-Vision-Inference-Node",
    "https://api.apexuhi.io/v1/models/vision",
    callPrice1
  );
  await tx.wait();
  console.log("  ✓ Registered: Multimodal-Vision-Inference-Node (Price: 0.5 AUHI)");

  const callPrice2 = hre.ethers.parseEther("0.1"); // 0.1 AUHI per conway pattern analysis
  tx = await x402Bazaar.registerService(
    "Conway-Cellular-Pattern-Engine",
    "https://api.apexuhi.io/v1/conway/pattern",
    callPrice2
  );
  await tx.wait();
  console.log("  ✓ Registered: Conway-Cellular-Pattern-Engine (Price: 0.1 AUHI)");

  // Export deployment manifest
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    contracts: {
      PQCQuantumVault: pqcVaultAddress,
      ConwayAutomatonEngine: conwayEngineAddress,
      ApexUHIToken: uhiTokenAddress,
      UHIDividendDistributor: distributorAddress,
      X402BazaarProtocol: bazaarAddress,
      UHIAutomator: automatorAddress,
    },
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const outputPath = path.join(deploymentsDir, `${network.chainId}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n🎉 Deployment manifest successfully saved to: ${outputPath}`);
  console.log("==================================================");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
