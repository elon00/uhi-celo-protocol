// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IConwayEngine.sol";
import "./ApexUHIToken.sol";

/**
 * @title UHIDividendDistributor
 * @notice Real Universal High Income (UHI) Dividend and Staking Engine
 * @dev Distributes streaming high-income yields to all stakers and verified citizen accounts.
 * Yield issuance rate is dynamically modulated in real-time by the Conway Cellular Automaton Engine
 * and boosted by direct fee streams from the x402 AI Agent Bazaar.
 */
contract UHIDividendDistributor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    ApexUHIToken public immutable uhiToken;
    IConwayEngine public conwayEngine;

    uint256 public constant PRECISION = 1e18;
    // Base annual emission rate per staked token in basis points (e.g., 2000 bps = 20% base APY)
    uint256 public baseEmissionRateBps = 2000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    // Global state
    uint256 public totalStaked;
    uint256 public accDividendPerShare; // Accumulated dividend per share (scaled by PRECISION)
    uint256 public lastUpdateTimestamp;

    // Staker account records
    struct StakerInfo {
        uint256 amount;           // Total staked $AUHI
        uint256 rewardDebt;       // Reward debt for precision calculation
        uint256 pendingRewards;   // Accumulated unharvested UHI rewards
        uint256 lastClaimTime;    // Timestamp of last yield harvest
    }

    mapping(address => StakerInfo) public stakers;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event HighIncomeClaimed(address indexed user, uint256 amount);
    event ExternalDividendsDeposited(address indexed source, uint256 amount);
    event ConwayEngineUpdated(address indexed oldEngine, address indexed newEngine);
    event BaseEmissionRateUpdated(uint256 oldRate, uint256 newRate);

    constructor(address _uhiToken, address _conwayEngine) Ownable(msg.sender) {
        require(_uhiToken != address(0), "Invalid token");
        uhiToken = ApexUHIToken(_uhiToken);
        conwayEngine = IConwayEngine(_conwayEngine);
        lastUpdateTimestamp = block.timestamp;
    }

    function setConwayEngine(address _conwayEngine) external onlyOwner {
        require(_conwayEngine != address(0), "Invalid engine");
        emit ConwayEngineUpdated(address(conwayEngine), _conwayEngine);
        conwayEngine = IConwayEngine(_conwayEngine);
    }

    function setBaseEmissionRate(uint256 _newRateBps) external onlyOwner {
        updatePool();
        emit BaseEmissionRateUpdated(baseEmissionRateBps, _newRateBps);
        baseEmissionRateBps = _newRateBps;
    }

    /**
     * @notice Updates pool dividend variables using real elapsed time and Conway multiplier
     */
    function updatePool() public {
        if (block.timestamp <= lastUpdateTimestamp) {
            return;
        }

        if (totalStaked == 0) {
            lastUpdateTimestamp = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp - lastUpdateTimestamp;

        // Fetch dynamic yield multiplier from Conway Cellular Automaton (10000 = 1.0x, 30000 = 3.0x)
        uint256 conwayMultiplierBps = address(conwayEngine) != address(0) 
            ? conwayEngine.getYieldMultiplier() 
            : 10000;

        // Effective annual emission rate with Conway vitality boost
        // Example: Base 20% * 1.5x Conway Multiplier = 30% APY
        uint256 effectiveApyBps = (baseEmissionRateBps * conwayMultiplierBps) / 10000;

        // Algorithmic high-income emission tokens generated during this time slice
        uint256 tokensToEmit = (totalStaked * effectiveApyBps * timeElapsed) / (10000 * SECONDS_PER_YEAR);

        if (tokensToEmit > 0) {
            // Mint elastic UHI tokens directly into this pool
            uhiToken.mintHighIncome(address(this), tokensToEmit, "Conway UHI Streaming Emission");
            accDividendPerShare += (tokensToEmit * PRECISION) / totalStaked;
        }

        lastUpdateTimestamp = block.timestamp;
    }

    /**
     * @notice Allows external protocols (like x402 Bazaar) to deposit real revenue dividends
     */
    function depositDividends(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        updatePool();

        IERC20(address(uhiToken)).safeTransferFrom(msg.sender, address(this), amount);

        if (totalStaked > 0) {
            accDividendPerShare += (amount * PRECISION) / totalStaked;
        }

        emit ExternalDividendsDeposited(msg.sender, amount);
    }

    /**
     * @notice Stakes $AUHI to earn continuous Universal High Income dividends
     */
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake 0");
        updatePool();

        StakerInfo storage user = stakers[msg.sender];

        // Settle pending rewards
        if (user.amount > 0) {
            uint256 pending = ((user.amount * accDividendPerShare) / PRECISION) - user.rewardDebt;
            user.pendingRewards += pending;
        }

        IERC20(address(uhiToken)).safeTransferFrom(msg.sender, address(this), amount);
        user.amount += amount;
        totalStaked += amount;
        user.rewardDebt = (user.amount * accDividendPerShare) / PRECISION;
        user.lastClaimTime = block.timestamp;

        emit Staked(msg.sender, amount);
    }

    /**
     * @notice Unstakes $AUHI from the UHI pool
     */
    function unstake(uint256 amount) external nonReentrant {
        StakerInfo storage user = stakers[msg.sender];
        require(user.amount >= amount, "Withdraw exceeds staked balance");
        updatePool();

        uint256 pending = ((user.amount * accDividendPerShare) / PRECISION) - user.rewardDebt;
        user.pendingRewards += pending;

        user.amount -= amount;
        totalStaked -= amount;
        user.rewardDebt = (user.amount * accDividendPerShare) / PRECISION;

        IERC20(address(uhiToken)).safeTransfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    /**
     * @notice Claims accumulated Universal High Income dividends
     */
    function claimHighIncome() external nonReentrant returns (uint256 reward) {
        updatePool();

        StakerInfo storage user = stakers[msg.sender];
        uint256 accumulated = ((user.amount * accDividendPerShare) / PRECISION) - user.rewardDebt;
        reward = user.pendingRewards + accumulated;
        require(reward > 0, "No pending high income");

        user.pendingRewards = 0;
        user.rewardDebt = (user.amount * accDividendPerShare) / PRECISION;
        user.lastClaimTime = block.timestamp;

        IERC20(address(uhiToken)).safeTransfer(msg.sender, reward);
        emit HighIncomeClaimed(msg.sender, reward);
    }

    /**
     * @notice Returns total pending UHI dividend for a user
     */
    function getPendingReward(address account) external view returns (uint256) {
        StakerInfo memory user = stakers[account];
        uint256 currentAccPerShare = accDividendPerShare;

        if (block.timestamp > lastUpdateTimestamp && totalStaked > 0) {
            uint256 timeElapsed = block.timestamp - lastUpdateTimestamp;
            uint256 conwayMultiplierBps = address(conwayEngine) != address(0) 
                ? conwayEngine.getYieldMultiplier() 
                : 10000;
            uint256 effectiveApyBps = (baseEmissionRateBps * conwayMultiplierBps) / 10000;
            uint256 tokensToEmit = (totalStaked * effectiveApyBps * timeElapsed) / (10000 * SECONDS_PER_YEAR);
            currentAccPerShare += (tokensToEmit * PRECISION) / totalStaked;
        }

        uint256 pending = ((user.amount * currentAccPerShare) / PRECISION) - user.rewardDebt;
        return user.pendingRewards + pending;
    }
}
