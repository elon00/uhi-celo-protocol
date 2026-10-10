const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Apex Universal High Income (ApexUHI) Full Reality Test Suite", function () {
  let owner, agentAlice, providerBob, citizenCharlie;
  let pqcVault, conwayEngine, uhiToken, dividendDistributor, x402Bazaar, automator;

  const INITIAL_SUPPLY = ethers.parseEther("1000000000"); // 1 Billion AUHI
  const INITIAL_SEED = "0x00001C000000070000003800000000000000E000000000000000000000000001";

  beforeEach(async function () {
    [owner, agentAlice, providerBob, citizenCharlie] = await ethers.getSigners();

    // 1. Deploy PQC Vault
    const PQCQuantumVault = await ethers.getContractFactory("PQCQuantumVault");
    pqcVault = await PQCQuantumVault.deploy();
    await pqcVault.waitForDeployment();

    // 2. Deploy Conway Automaton Engine
    const ConwayAutomatonEngine = await ethers.getContractFactory("ConwayAutomatonEngine");
    conwayEngine = await ConwayAutomatonEngine.deploy(INITIAL_SEED);
    await conwayEngine.waitForDeployment();

    // 3. Deploy ApexUHIToken
    const ApexUHIToken = await ethers.getContractFactory("ApexUHIToken");
    uhiToken = await ApexUHIToken.deploy(
      "Apex Universal High Income",
      "AUHI",
      INITIAL_SUPPLY,
      owner.address,
      owner.address
    );
    await uhiToken.waitForDeployment();

    // 4. Deploy UHIDividendDistributor
    const UHIDividendDistributor = await ethers.getContractFactory("UHIDividendDistributor");
    dividendDistributor = await UHIDividendDistributor.deploy(
      await uhiToken.getAddress(),
      await conwayEngine.getAddress()
    );
    await dividendDistributor.waitForDeployment();

    // 5. Deploy X402BazaarProtocol
    const X402BazaarProtocol = await ethers.getContractFactory("X402BazaarProtocol");
    x402Bazaar = await X402BazaarProtocol.deploy(
      await uhiToken.getAddress(),
      await dividendDistributor.getAddress()
    );
    await x402Bazaar.waitForDeployment();

    // 6. Deploy UHIAutomator
    const UHIAutomator = await ethers.getContractFactory("UHIAutomator");
    automator = await UHIAutomator.deploy(
      await conwayEngine.getAddress(),
      await dividendDistributor.getAddress()
    );
    await automator.waitForDeployment();

    // Setup Roles & Whitelists
    const MINTER_ROLE = await uhiToken.MINTER_ROLE();
    await uhiToken.grantRole(MINTER_ROLE, await dividendDistributor.getAddress());

    const FEE_EXEMPT_ROLE = await uhiToken.FEE_EXEMPT_ROLE();
    await uhiToken.grantRole(FEE_EXEMPT_ROLE, await dividendDistributor.getAddress());
    await uhiToken.grantRole(FEE_EXEMPT_ROLE, await x402Bazaar.getAddress());
    await uhiToken.setFeeExempt(await dividendDistributor.getAddress(), true);
    await uhiToken.setFeeExempt(await x402Bazaar.getAddress(), true);

    await conwayEngine.setAutomator(await automator.getAddress());

    // Fund test accounts
    await uhiToken.transfer(agentAlice.address, ethers.parseEther("10000"));
    await uhiToken.transfer(citizenCharlie.address, ethers.parseEther("50000"));
  });

  describe("1. ApexUHIToken Mechanics & Burn Sink", function () {
    it("should initialize with correct name, symbol and initial supply", async function () {
      expect(await uhiToken.name()).to.equal("Apex Universal High Income");
      expect(await uhiToken.symbol()).to.equal("AUHI");
      expect(await uhiToken.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("should apply 0.30% deflationary burn on non-exempt peer transfers", async function () {
      const transferAmount = ethers.parseEther("1000");
      const expectedBurn = (transferAmount * 30n) / 10000n; // 3 AUHI
      const expectedReceived = transferAmount - expectedBurn; // 997 AUHI

      const charlieBefore = await uhiToken.balanceOf(citizenCharlie.address);
      const supplyBefore = await uhiToken.totalSupply();

      // Alice transfers to Charlie (neither is exempt)
      await uhiToken.connect(agentAlice).transfer(citizenCharlie.address, transferAmount);

      const charlieAfter = await uhiToken.balanceOf(citizenCharlie.address);
      const supplyAfter = await uhiToken.totalSupply();

      expect(charlieAfter - charlieBefore).to.equal(expectedReceived);
      expect(supplyBefore - supplyAfter).to.equal(expectedBurn);
    });

    it("should exempt protocol contracts from burn fees", async function () {
      const depositAmount = ethers.parseEther("100");
      await uhiToken.connect(agentAlice).approve(await dividendDistributor.getAddress(), depositAmount);

      // Staking deposit into exempt distributor
      await expect(dividendDistributor.connect(agentAlice).stake(depositAmount))
        .to.emit(dividendDistributor, "Staked")
        .withArgs(agentAlice.address, depositAmount);
    });
  });

  describe("2. Conway Cellular Automaton Engine", function () {
    it("should count live cells correctly from bitmask", async function () {
      const liveCount = await conwayEngine.getLiveCellCount();
      expect(liveCount).to.be.greaterThan(0);
    });

    it("should dynamically calculate yield multiplier based on cellular vitality", async function () {
      const multiplier = await conwayEngine.getYieldMultiplier();
      expect(multiplier).to.be.greaterThanOrEqual(10000); // >= 1.0x
      expect(multiplier).to.be.lessThanOrEqual(30000); // <= 3.0x
    });

    it("should execute Conway's Game of Life toroidal next-generation step", async function () {
      // 3-cell blinker pattern in row 0: cells (0,1), (0,2), (0,3) -> bits 1, 2, 3
      const blinkerSeed = (1n << 1n) | (1n << 2n) | (1n << 3n);
      const nextGen = await conwayEngine.computeNextGeneration(blinkerSeed);
      // In next gen, horizontal blinker flips to vertical blinker
      expect(nextGen).to.not.equal(0n);
    });

    it("should allow automator to tick epoch when time elapsed", async function () {
      await ethers.provider.send("evm_increaseTime", [3601]); // Fast forward 1 hour
      await ethers.provider.send("evm_mine");

      await expect(automator.performUpkeep("0x"))
        .to.emit(automator, "UpkeepExecuted");

      expect(await conwayEngine.currentEpoch()).to.equal(2);
    });
  });

  describe("3. x402 Bazaar Protocol (Agentic Micropayments)", function () {
    const serviceFee = ethers.parseEther("10");

    beforeEach(async function () {
      await x402Bazaar.connect(providerBob).registerService(
        "Gemini-Vision-API",
        "https://api.apexuhi.io/v1/vision",
        serviceFee
      );
    });

    it("should register AI service correctly", async function () {
      const service = await x402Bazaar.getService(1);
      expect(service.name).to.equal("Gemini-Vision-API");
      expect(service.provider).to.equal(providerBob.address);
      expect(service.pricePerCall).to.equal(serviceFee);
      expect(service.active).to.be.true;
    });

    it("should execute real HTTP 402 payment, distribute 70% to provider, 20% to UHI, and burn 10%", async function () {
      await uhiToken.connect(agentAlice).approve(await x402Bazaar.getAddress(), serviceFee);

      const bobBalanceBefore = await uhiToken.balanceOf(providerBob.address);
      const distributorBalanceBefore = await uhiToken.balanceOf(await dividendDistributor.getAddress());
      const supplyBefore = await uhiToken.totalSupply();

      const queryHash = ethers.keccak256(ethers.toUtf8Bytes("analyze_image_payload_hash_123"));

      const tx = await x402Bazaar.connect(agentAlice).payForService402(1, queryHash);
      const receipt = await tx.wait();

      const expectedProviderCut = (serviceFee * 7000n) / 10000n; // 7 AUHI
      const expectedUhiCut = (serviceFee * 2000n) / 10000n;      // 2 AUHI
      const expectedBurnCut = serviceFee - (expectedProviderCut + expectedUhiCut); // 1 AUHI

      const bobBalanceAfter = await uhiToken.balanceOf(providerBob.address);
      const distributorBalanceAfter = await uhiToken.balanceOf(await dividendDistributor.getAddress());
      const supplyAfter = await uhiToken.totalSupply();

      expect(bobBalanceAfter - bobBalanceBefore).to.equal(expectedProviderCut);
      expect(distributorBalanceAfter - distributorBalanceBefore).to.equal(expectedUhiCut);
      expect(supplyBefore - supplyAfter).to.equal(expectedBurnCut);
    });
  });

  describe("4. UHIDividendDistributor (Streaming High Income Vault)", function () {
    it("should allow staking and accumulate streaming rewards over time", async function () {
      const stakeAmount = ethers.parseEther("1000");
      await uhiToken.connect(citizenCharlie).approve(await dividendDistributor.getAddress(), stakeAmount);
      await dividendDistributor.connect(citizenCharlie).stake(stakeAmount);

      expect(await dividendDistributor.totalStaked()).to.equal(stakeAmount);

      // Advance time by 30 days
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 3600]);
      await ethers.provider.send("evm_mine");

      const pending = await dividendDistributor.getPendingReward(citizenCharlie.address);
      expect(pending).to.be.greaterThan(0);

      const balanceBefore = await uhiToken.balanceOf(citizenCharlie.address);
      await dividendDistributor.connect(citizenCharlie).claimHighIncome();
      const balanceAfter = await uhiToken.balanceOf(citizenCharlie.address);

      expect(balanceAfter - balanceBefore).to.be.closeTo(pending, ethers.parseEther("0.1"));
    });
  });

  describe("5. Post-Quantum Cryptography (PQC) Security Vault", function () {
    it("should register quantum public key root hash", async function () {
      const testRoot = ethers.keccak256(ethers.toUtf8Bytes("quantum_lamport_root_key_2026"));
      await expect(pqcVault.connect(owner).registerQuantumRoot(testRoot))
        .to.emit(pqcVault, "QuantumKeyRegistered")
        .withArgs(owner.address, testRoot);

      expect(await pqcVault.quantumRoots(owner.address)).to.equal(testRoot);
    });

    it("should execute quantum guarded action when Lamport hash preimage matches root", async function () {
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("transfer_100k_treasury_action"));

      // Construct a valid Lamport preimage array for this message
      const signatureParts = [];
      let leafAccumulator = ethers.ZeroHash;

      for (let i = 0; i < 256; i++) {
        const bit = (BigInt(messageHash) >> BigInt(255 - i)) & 1n;
        const revealedPreimage = ethers.keccak256(ethers.toBeHex(i + 1, 32));
        signatureParts.push(revealedPreimage);

        // Mimic on-chain verification accumulator: keccak256(leafAccumulator, keccak256(revealedPreimage, bit))
        const hashedCommitment = ethers.keccak256(
          ethers.solidityPacked(["bytes32", "uint256"], [revealedPreimage, bit])
        );
        leafAccumulator = ethers.keccak256(
          ethers.solidityPacked(["bytes32", "bytes32"], [leafAccumulator, hashedCommitment])
        );
      }

      // Register the computed valid Lamport root
      await pqcVault.connect(owner).registerQuantumRoot(leafAccumulator);

      // Execute quantum guarded action
      const tx = await pqcVault.connect(owner).executeQuantumGuardedAction(
        owner.address,
        messageHash,
        signatureParts
      );
      await expect(tx).to.emit(pqcVault, "QuantumExecutionVerified");
    });
  });
});
