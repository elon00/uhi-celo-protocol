// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IX402Bazaar {
    struct AIService {
        string name;
        string endpointUri;
        address provider;
        uint256 pricePerCall; // In AUHI wei
        bool active;
        uint256 totalCalls;
        uint256 totalRevenue;
    }

    event ServiceRegistered(uint256 indexed serviceId, string name, address indexed provider, uint256 pricePerCall);
    event ServiceUpdated(uint256 indexed serviceId, uint256 pricePerCall, bool active);
    event PaymentProcessed402(
        uint256 indexed serviceId,
        address indexed clientAgent,
        bytes32 indexed receiptHash,
        uint256 amountPaid,
        uint256 uhiDividendShare,
        uint256 burnedShare
    );

    function registerService(string calldata name, string calldata endpointUri, uint256 pricePerCall) external returns (uint256 serviceId);
    function payForService402(uint256 serviceId, bytes32 queryHash) external returns (bytes32 receiptHash);
    function getService(uint256 serviceId) external view returns (AIService memory);
    function totalServices() external view returns (uint256);
}
