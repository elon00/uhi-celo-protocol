// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IConwayEngine {
    event EpochAdvanced(uint256 indexed epoch, uint256 liveCells, uint256 yieldMultiplier, uint256 stateBitmask);
    event GridSeeded(uint256 indexed epoch, uint256 stateBitmask);

    function currentEpoch() external view returns (uint256);
    function currentGridState() external view returns (uint256);
    function getLiveCellCount() external view returns (uint256);
    function getYieldMultiplier() external view returns (uint256);
    function tickEpoch() external returns (uint256 newEpoch, uint256 liveCount, uint256 multiplier);
    function seedGrid(uint256 seedBitmask) external;
}
