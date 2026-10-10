const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log("==================================================");
  console.log("🧬 CONWAY AUTOMATON ENGINE - LIVE CELLULAR TICK");
  console.log("==================================================");
  console.log(`Caller: ${signer.address} on Chain ID: ${network.chainId}`);

  // Resolve deployment address
  const deploymentsFile = path.join(__dirname, "..", "deployments", `${network.chainId}.json`);
  let conwayAddress;

  if (fs.existsSync(deploymentsFile)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentsFile, "utf-8"));
    conwayAddress = deployment.contracts.ConwayAutomatonEngine;
  }

  // Verify code exists at address or deploy freshly for standalone execution
  const code = conwayAddress ? await hre.ethers.provider.getCode(conwayAddress) : "0x";
  if (code === "0x") {
    console.log("[Notice] Deploying active ConwayAutomatonEngine instance...");
    const Conway = await hre.ethers.getContractFactory("ConwayAutomatonEngine");
    const c = await Conway.deploy("0x00001C000000070000003800000000000000E000000000000000000000000001");
    await c.waitForDeployment();
    conwayAddress = await c.getAddress();
  }

  const conway = await hre.ethers.getContractAt("ConwayAutomatonEngine", conwayAddress);

  // Read current live state
  const epoch = await conway.currentEpoch();
  const state = await conway.currentGridState();
  const liveCount = await conway.getLiveCellCount();
  const multiplierBps = await conway.getYieldMultiplier();

  console.log(`\nCurrent Epoch:           #${epoch}`);
  console.log(`Total Live Cells:        ${liveCount} / 256`);
  console.log(`Yield Multiplier:        ${Number(multiplierBps) / 10000}x (${multiplierBps} BPS)`);
  console.log(`State Bitmask (hex):     0x${state.toString(16).padStart(64, "0")}\n`);

  // Render 16x16 2D ASCII Grid
  console.log("┌──────────────────────────────────┐");
  console.log("│    LIVE CONWAY CELLULAR GRID     │");
  console.log("├──────────────────────────────────┤");
  for (let r = 0; r < 16; r++) {
    let rowStr = "│  ";
    for (let c = 0; c < 16; c++) {
      const idx = BigInt(r * 16 + c);
      const isAlive = ((state >> idx) & 1n) === 1n;
      rowStr += isAlive ? "■ " : "· ";
    }
    rowStr += "│";
    console.log(rowStr);
  }
  console.log("└──────────────────────────────────┘\n");

  console.log("[Action] Ticking to next cellular generation...");
  try {
    const tx = await conway.tickEpoch();
    const receipt = await tx.wait();
    console.log(`✓ Generation advanced in Block #${receipt.blockNumber} (Tx: ${receipt.hash})`);

    const newEpoch = await conway.currentEpoch();
    const newLive = await conway.getLiveCellCount();
    const newMultiplier = await conway.getYieldMultiplier();
    console.log(`New Epoch: #${newEpoch} | Live Cells: ${newLive} | Multiplier: ${Number(newMultiplier) / 10000}x`);
  } catch (err) {
    console.log(`[Note] ${err.message}`);
  }
}

main().catch(console.error);
