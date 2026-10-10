// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ConwayAutomatonEngine.sol";
import "./UHIDividendDistributor.sol";

/**
 * @title UHIAutomator
 * @notice Real Automation Keeper Contract for Celo L2 (Gelato / Chainlink / Autonomous Agent compatible)
 * @dev Continuously triggers cellular generations in the Conway engine and updates dividend pools.
 */
contract UHIAutomator is Ownable {
    ConwayAutomatonEngine public immutable conwayEngine;
    UHIDividendDistributor public immutable dividendDistributor;

    event UpkeepExecuted(uint256 indexed epoch, uint256 liveCells, uint256 multiplier, address indexed trigger);

    constructor(address _conwayEngine, address _dividendDistributor) Ownable(msg.sender) {
        require(_conwayEngine != address(0), "Invalid Conway engine");
        require(_dividendDistributor != address(0), "Invalid distributor");
        conwayEngine = ConwayAutomatonEngine(_conwayEngine);
        dividendDistributor = UHIDividendDistributor(_dividendDistributor);
    }

    /**
     * @notice Chainlink / Gelato compatible check function
     */
    function checkUpkeep(bytes calldata /* checkData */) external view returns (bool upkeepNeeded, bytes memory performData) {
        bool timeElapsed = block.timestamp >= conwayEngine.lastTickTimestamp() + conwayEngine.minEpochDuration();
        upkeepNeeded = timeElapsed;
        performData = abi.encode(block.timestamp);
    }

    /**
     * @notice Executes automated epoch progression and yield compounding
     */
    function performUpkeep(bytes calldata /* performData */) external {
        require(
            block.timestamp >= conwayEngine.lastTickTimestamp() + conwayEngine.minEpochDuration(),
            "Epoch interval not elapsed"
        );

        // 1. Tick the Conway Automaton
        (uint256 epoch, uint256 liveCells, uint256 multiplier) = conwayEngine.tickEpoch();

        // 2. Refresh UHI Dividend distribution pool
        dividendDistributor.updatePool();

        emit UpkeepExecuted(epoch, liveCells, multiplier, msg.sender);
    }
}
