const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, agentWallet] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log("==================================================");
  console.log("🤖 REAL x402 AGENTIC HTTP 402 PAYMENT CLIENT");
  console.log("==================================================");
  console.log(`Agent Wallet Address: ${agentWallet.address}`);
  console.log(`Celo Network:         ${network.name} (Chain ID: ${network.chainId})`);

  // Load deployed addresses
  const deploymentsFile = path.join(__dirname, "..", "deployments", `${network.chainId}.json`);
  let bazaarAddress;
  let uhiTokenAddress;

  if (fs.existsSync(deploymentsFile)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentsFile, "utf-8"));
    bazaarAddress = deployment.contracts.X402BazaarProtocol;
    uhiTokenAddress = deployment.contracts.ApexUHIToken;
  }

  const code = bazaarAddress ? await hre.ethers.provider.getCode(bazaarAddress) : "0x";
  if (code === "0x") {
    console.log("[Notice] Deploying active test contracts on current network session...");
    const ApexUHIToken = await hre.ethers.getContractFactory("ApexUHIToken");
    const token = await ApexUHIToken.deploy(
      "Apex Universal High Income",
      "AUHI",
      hre.ethers.parseEther("1000000"),
      deployer.address,
      deployer.address
    );
    await token.waitForDeployment();
    uhiTokenAddress = await token.getAddress();

    const X402Bazaar = await hre.ethers.getContractFactory("X402BazaarProtocol");
    const bazaar = await X402Bazaar.deploy(uhiTokenAddress, deployer.address);
    await bazaar.waitForDeployment();
    bazaarAddress = await bazaar.getAddress();

    // Whitelist bazaar from burn fee
    await token.setFeeExempt(bazaarAddress, true);

    // Register service #1
    await bazaar.registerService(
      "Gemini-Multimodal-Inference-Node",
      "https://api.apexuhi.io/v1/inference",
      hre.ethers.parseEther("2.5")
    );

    // Fund agent wallet
    await token.transfer(agentWallet.address, hre.ethers.parseEther("100"));
  }

  const uhiToken = await hre.ethers.getContractAt("ApexUHIToken", uhiTokenAddress);
  const bazaar = await hre.ethers.getContractAt("X402BazaarProtocol", bazaarAddress);

  const serviceId = 1;
  const service = await bazaar.getService(serviceId);
  console.log(`\nTarget Service #${serviceId}:  "${service.name}"`);
  console.log(`Endpoint URI:              ${service.endpointUri}`);
  console.log(`Provider Address:          ${service.provider}`);
  console.log(`Price per Call:            ${hre.ethers.formatEther(service.pricePerCall)} $AUHI`);

  // Check Agent Balance
  const agentBal = await uhiToken.balanceOf(agentWallet.address);
  console.log(`Agent $AUHI Balance:       ${hre.ethers.formatEther(agentBal)} AUHI`);

  // 1. Approve $AUHI
  console.log("\n[Step 1] Approving $AUHI transfer to x402 Bazaar Protocol...");
  const approveTx = await uhiToken.connect(agentWallet).approve(bazaarAddress, service.pricePerCall);
  await approveTx.wait();
  console.log("  ✓ Approval confirmed!");

  // 2. Compute cryptographic query hash
  const requestPayload = {
    model: "gemini-2.5-flash-multimodal",
    prompt: "Analyze latest Celo L2 block gas telemetry and optimize liquidity rebalancing",
    timestamp: Date.now(),
    agent: agentWallet.address
  };
  const queryHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(JSON.stringify(requestPayload)));
  console.log(`\n[Step 2] Prepared Request Payload Hash: ${queryHash}`);

  // 3. Execute HTTP 402 on-chain payment
  console.log("[Step 3] Submitting HTTP 402 payment transaction to Celo...");
  const payTx = await bazaar.connect(agentWallet).payForService402(serviceId, queryHash);
  const receipt = await payTx.wait();

  // Find receipt hash
  let receiptHash;
  for (const log of receipt.logs) {
    try {
      const parsed = bazaar.interface.parseLog(log);
      if (parsed && parsed.name === "PaymentProcessed402") {
        receiptHash = parsed.args.receiptHash;
        console.log(`\n🎉 [x402 SUCCESS] Payment Processed in Block #${receipt.blockNumber}!`);
        console.log(`  -> Receipt Hash:        ${receiptHash}`);
        console.log(`  -> Dividend Cut to UHI: ${hre.ethers.formatEther(parsed.args.uhiDividendShare)} AUHI`);
        console.log(`  -> Burned Cut:          ${hre.ethers.formatEther(parsed.args.burnedShare)} AUHI`);
        break;
      }
    } catch {}
  }

  // 4. Show real HTTP headers for API invocation
  console.log("\n[Step 4] Agent Dispatches Authorized HTTP 402 Request:");
  console.log("--------------------------------------------------");
  console.log(`POST ${service.endpointUri} HTTP/1.1`);
  console.log(`Host: api.apexuhi.io`);
  console.log(`Content-Type: application/json`);
  console.log(`X-402-Receipt: ${receiptHash}`);
  console.log(`X-402-Client: ${agentWallet.address}`);
  console.log(`Body: ${JSON.stringify(requestPayload, null, 2)}`);
  console.log("--------------------------------------------------");
}

main().catch(console.error);
