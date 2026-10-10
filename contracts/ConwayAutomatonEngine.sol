// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IConwayEngine.sol";

/**
 * @title ConwayAutomatonEngine
 * @notice Fully on-chain 16x16 Toroidal Cellular Automaton (Conway's Game of Life)
 * @dev Governs the dynamic elastic emission multiplier for the Universal High Income (UHI) pool.
 * Each cell represents a micro-economic actor in the Celo L2 economy.
 */
contract ConwayAutomatonEngine is IConwayEngine, Ownable {
    uint256 public constant GRID_WIDTH = 16;
    uint256 public constant GRID_HEIGHT = 16;
    uint256 public constant TOTAL_CELLS = 256; // Fits within a uint256

    uint256 public override currentEpoch;
    uint256 public override currentGridState;
    uint256 public lastTickTimestamp;
    uint256 public minEpochDuration = 1 hours; // Minimum interval between cellular generations

    // Multiplier boundaries (Basis points: 10000 = 100% = 1.0x)
    uint256 public constant BASE_MULTIPLIER_BPS = 10000;
    uint256 public constant MAX_MULTIPLIER_BPS = 30000; // 3.0x peak high-income multiplier

    address public automator;

    modifier onlyAutomatorOrOwner() {
        require(msg.sender == automator || msg.sender == owner(), "Not authorized to tick");
        _;
    }

    constructor(uint256 initialSeed) Ownable(msg.sender) {
        // Default glider / pulsar seed if 0 provided
        if (initialSeed == 0) {
            // Famous "Glider" + "Blinker" + "Beacon" seed pattern encoded in 256-bit bitmask
            initialSeed = 0x00001C000000070000003800000000000000E000000000000000000000000001;
        }
        currentGridState = initialSeed;
        lastTickTimestamp = block.timestamp;
        currentEpoch = 1;
        emit GridSeeded(1, initialSeed);
    }

    function setAutomator(address _automator) external onlyOwner {
        automator = _automator;
    }

    function setMinEpochDuration(uint256 duration) external onlyOwner {
        minEpochDuration = duration;
    }

    /**
     * @notice Seeds the cellular grid with new entropy bitmask
     */
    function seedGrid(uint256 seedBitmask) external override onlyOwner {
        currentGridState = seedBitmask;
        emit GridSeeded(currentEpoch, seedBitmask);
    }

    /**
     * @notice Counts total living cells in the current 256-bit state
     */
    function getLiveCellCount() public view override returns (uint256 count) {
        uint256 state = currentGridState;
        while (state > 0) {
            state &= (state - 1); // Brian Kernighan bit-count
            count++;
        }
    }

    /**
     * @notice Calculates dynamic UHI dividend yield multiplier based on cellular vitality
     * @return multiplierBps Basis points where 10000 = 100% (1.0x)
     */
    function getYieldMultiplier() public view override returns (uint256 multiplierBps) {
        uint256 liveCells = getLiveCellCount();
        
        // Multiplier formula: Base (1.0x) + (liveCells * 78 bps) capped at 30000 bps (3.0x)
        multiplierBps = BASE_MULTIPLIER_BPS + (liveCells * 78);
        if (multiplierBps > MAX_MULTIPLIER_BPS) {
            multiplierBps = MAX_MULTIPLIER_BPS;
        }
    }

    /**
     * @notice Advances the automaton to the next generation using Conway's rules
     */
    function tickEpoch() external override onlyAutomatorOrOwner returns (uint256, uint256, uint256) {
        require(block.timestamp >= lastTickTimestamp + minEpochDuration, "Epoch interval not elapsed");

        uint256 nextState = computeNextGeneration(currentGridState);
        currentGridState = nextState;
        currentEpoch += 1;
        lastTickTimestamp = block.timestamp;

        uint256 liveCount = getLiveCellCount();
        uint256 multiplier = getYieldMultiplier();

        emit EpochAdvanced(currentEpoch, liveCount, multiplier, nextState);
        return (currentEpoch, liveCount, multiplier);
    }

    /**
     * @notice Pure function computing Conway Game of Life next generation on 16x16 toroidal bitmask
     */
    function computeNextGeneration(uint256 state) public pure returns (uint256 nextState) {
        for (uint256 r = 0; r < 16; r++) {
            for (uint256 c = 0; c < 16; c++) {
                uint256 cellIndex = r * 16 + c;
                bool isAlive = ((state >> cellIndex) & 1) == 1;

                uint256 liveNeighbors = 0;
                for (int256 dr = -1; dr <= 1; dr++) {
                    for (int256 dc = -1; dc <= 1; dc++) {
                        if (dr == 0 && dc == 0) continue;

                        int256 nr = int256(r) + dr;
                        int256 nc = int256(c) + dc;

                        // Toroidal wraparound
                        if (nr < 0) nr = 15;
                        else if (nr > 15) nr = 0;

                        if (nc < 0) nc = 15;
                        else if (nc > 15) nc = 0;

                        uint256 neighborIndex = uint256(nr) * 16 + uint256(nc);
                        if (((state >> neighborIndex) & 1) == 1) {
                            liveNeighbors++;
                        }
                    }
                }

                // Conway's classic rules
                if (isAlive) {
                    if (liveNeighbors == 2 || liveNeighbors == 3) {
                        nextState |= (1 << cellIndex);
                    }
                } else {
                    if (liveNeighbors == 3) {
                        nextState |= (1 << cellIndex);
                    }
                }
            }
        }
    }
}
