import { ethers } from "ethers";

export interface AIServiceMetadata {
  id: number;
  name: string;
  endpointUri: string;
  provider: string;
  pricePerCall: bigint;
  active: boolean;
}

export interface X402PaymentReceipt {
  serviceId: number;
  receiptHash: string;
  txHash: string;
  amountPaid: bigint;
  blockNumber: number;
}

const X402_BAZAAR_ABI = [
  "function getService(uint256 serviceId) external view returns (tuple(string name, string endpointUri, address provider, uint256 pricePerCall, bool active, uint256 totalCalls, uint256 totalRevenue))",
  "function payForService402(uint256 serviceId, bytes32 queryHash) external returns (bytes32 receiptHash)",
  "function totalServices() external view returns (uint256)",
  "event PaymentProcessed402(uint256 indexed serviceId, address indexed clientAgent, bytes32 indexed receiptHash, uint256 amountPaid, uint256 uhiDividendShare, uint256 burnedShare)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

export class X402AgentClient {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private bazaarContract: ethers.Contract;
  private uhiTokenContract: ethers.Contract;

  constructor(
    rpcUrl: string,
    privateKey: string,
    bazaarAddress: string,
    uhiTokenAddress: string
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
    this.bazaarContract = new ethers.Contract(bazaarAddress, X402_BAZAAR_ABI, this.signer);
    this.uhiTokenContract = new ethers.Contract(uhiTokenAddress, ERC20_ABI, this.signer);
  }

  /**
   * Fetches service details from Celo L2 blockchain
   */
  async getService(serviceId: number): Promise<AIServiceMetadata> {
    const raw = await this.bazaarContract.getService(serviceId);
    return {
      id: serviceId,
      name: raw[0],
      endpointUri: raw[1],
      provider: raw[2],
      pricePerCall: raw[3],
      active: raw[4],
    };
  }

  /**
   * Executes autonomous HTTP 402 payment in $AUHI for an AI inference request
   */
  async payAndQuery(
    serviceId: number,
    requestPayload: Record<string, unknown>
  ): Promise<{ receipt: X402PaymentReceipt; apiResponse: unknown }> {
    const service = await this.getService(serviceId);
    if (!service.active) {
      throw new Error(`AI Service #${serviceId} is currently inactive.`);
    }

    const signerAddress = await this.signer.getAddress();

    // 1. Check & approve allowance
    const allowance: bigint = await this.uhiTokenContract.allowance(
      signerAddress,
      await this.bazaarContract.getAddress()
    );
    if (allowance < service.pricePerCall) {
      console.log(`[x402 Agent] Approving $AUHI allowance...`);
      const approveTx = await this.uhiTokenContract.approve(
        await this.bazaarContract.getAddress(),
        service.pricePerCall * 100n
      );
      await approveTx.wait();
    }

    // 2. Hash payload
    const payloadBytes = ethers.toUtf8Bytes(JSON.stringify(requestPayload));
    const queryHash = ethers.keccak256(payloadBytes);

    // 3. Submit on-chain HTTP 402 payment
    console.log(`[x402 Agent] Broadcasting HTTP 402 payment to Celo L2...`);
    const tx = await this.bazaarContract.payForService402(serviceId, queryHash);
    const txReceipt = await tx.wait();

    // Parse receiptHash from PaymentProcessed402 event
    let receiptHash = "";
    for (const log of txReceipt.logs) {
      try {
        const parsed = this.bazaarContract.interface.parseLog(log);
        if (parsed && parsed.name === "PaymentProcessed402") {
          receiptHash = parsed.args.receiptHash;
          break;
        }
      } catch {
        // Continue
      }
    }

    const paymentReceipt: X402PaymentReceipt = {
      serviceId,
      receiptHash,
      txHash: txReceipt.hash,
      amountPaid: service.pricePerCall,
      blockNumber: txReceipt.blockNumber,
    };

    console.log(`[x402 Agent] Payment confirmed on-chain! Receipt Hash: ${receiptHash}`);

    // 4. Dispatch HTTP request with x402 header
    console.log(`[x402 Agent] Calling AI endpoint: ${service.endpointUri}`);
    const response = await fetch(service.endpointUri, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-402-Receipt": receiptHash,
        "X-402-Client": signerAddress,
      },
      body: JSON.stringify(requestPayload),
    });

    const apiResponse = await response.json();
    return { receipt: paymentReceipt, apiResponse };
  }
}
