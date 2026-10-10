// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IX402Bazaar.sol";
import "./ApexUHIToken.sol";

/**
 * @title X402BazaarProtocol
 * @notice Real On-Chain Implementation of HTTP 402 Payment Required for AI Agents on Celo L2
 * @dev Enables autonomous AI agents to query APIs, compute, and multimodal intelligence services
 * by paying micro-fees in $AUHI. Automatically streams dividend fees into the UHI pool and burns a deflationary portion.
 */
contract X402BazaarProtocol is IX402Bazaar, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    ApexUHIToken public immutable uhiToken;
    address public uhiDividendVault;

    // Fee distribution: 70% Provider, 20% UHI Dividend Vault, 10% Deflationary Burn
    uint256 public constant PROVIDER_SHARE_BPS = 7000;
    uint256 public constant UHI_SHARE_BPS = 2000;
    uint256 public constant BURN_SHARE_BPS = 1000;
    uint256 public constant TOTAL_BPS = 10000;

    uint256 private _serviceCounter;
    mapping(uint256 => AIService) public services;
    // Tracks processed payment receipts: receiptHash => bool
    mapping(bytes32 => bool) public verifiedReceipts;
    // Nonce tracker per agent
    mapping(address => uint256) public agentNonces;

    event UhiDividendVaultUpdated(address indexed oldVault, address indexed newVault);

    constructor(address _uhiToken, address _dividendVault) Ownable(msg.sender) {
        require(_uhiToken != address(0), "Invalid token address");
        require(_dividendVault != address(0), "Invalid dividend vault");
        uhiToken = ApexUHIToken(_uhiToken);
        uhiDividendVault = _dividendVault;
    }

    function setDividendVault(address _newVault) external onlyOwner {
        require(_newVault != address(0), "Invalid address");
        emit UhiDividendVaultUpdated(uhiDividendVault, _newVault);
        uhiDividendVault = _newVault;
    }

    /**
     * @notice Registers a new AI agent service on Celo
     * @param name Name of the service (e.g., 'Gemini-Flash-Inference-Node', 'Conway-Pattern-Solver')
     * @param endpointUri Real gateway endpoint URI
     * @param pricePerCall Price in AUHI wei per API request
     */
    function registerService(
        string calldata name,
        string calldata endpointUri,
        uint256 pricePerCall
    ) external override returns (uint256 serviceId) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(endpointUri).length > 0, "URI cannot be empty");
        require(pricePerCall > 0, "Price must be > 0");

        _serviceCounter++;
        serviceId = _serviceCounter;

        services[serviceId] = AIService({
            name: name,
            endpointUri: endpointUri,
            provider: msg.sender,
            pricePerCall: pricePerCall,
            active: true,
            totalCalls: 0,
            totalRevenue: 0
        });

        emit ServiceRegistered(serviceId, name, msg.sender, pricePerCall);
    }

    /**
     * @notice Updates existing service parameters
     */
    function updateService(
        uint256 serviceId,
        uint256 newPrice,
        bool active
    ) external {
        AIService storage s = services[serviceId];
        require(msg.sender == s.provider || msg.sender == owner(), "Unauthorized");
        s.pricePerCall = newPrice;
        s.active = active;
        emit ServiceUpdated(serviceId, newPrice, active);
    }

    /**
     * @notice Real execution of the HTTP 402 Payment Required handshake
     * @param serviceId Target service identifier
     * @param queryHash Cryptographic hash of the query / request payload
     * @return receiptHash Unique deterministic receipt verified by off-chain gateway
     */
    function payForService402(
        uint256 serviceId,
        bytes32 queryHash
    ) external override nonReentrant returns (bytes32 receiptHash) {
        AIService storage s = services[serviceId];
        require(s.active, "Service is inactive");
        uint256 price = s.pricePerCall;
        require(price > 0, "Invalid service");

        // Calculate distribution shares
        uint256 providerCut = (price * PROVIDER_SHARE_BPS) / TOTAL_BPS;
        uint256 uhiDividendCut = (price * UHI_SHARE_BPS) / TOTAL_BPS;
        uint256 burnCut = price - (providerCut + uhiDividendCut);

        // Pull full payment from caller agent
        IERC20(address(uhiToken)).safeTransferFrom(msg.sender, address(this), price);

        // 1. Pay AI Service Provider
        IERC20(address(uhiToken)).safeTransfer(s.provider, providerCut);

        // 2. Route Universal High Income dividend cut to Staking/Distribution pool
        IERC20(address(uhiToken)).safeTransfer(uhiDividendVault, uhiDividendCut);

        // 3. Deflationary sink: burn remaining tokens permanently
        uhiToken.burn(burnCut);

        // Update statistics
        s.totalCalls += 1;
        s.totalRevenue += price;
        uint256 nonce = ++agentNonces[msg.sender];

        // Generate tamper-proof receipt hash for off-chain API gatekeeper
        receiptHash = keccak256(
            abi.encodePacked(
                serviceId,
                msg.sender,
                s.provider,
                price,
                queryHash,
                nonce,
                block.chainid,
                block.number
            )
        );

        verifiedReceipts[receiptHash] = true;

        emit PaymentProcessed402(
            serviceId,
            msg.sender,
            receiptHash,
            price,
            uhiDividendCut,
            burnCut
        );
    }

    function getService(uint256 serviceId) external view override returns (AIService memory) {
        return services[serviceId];
    }

    function totalServices() external view override returns (uint256) {
        return _serviceCounter;
    }
}
