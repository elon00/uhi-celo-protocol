// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ApexUHIToken ($AUHI)
 * @notice Universal High Income Token deployed on Celo L2
 * @dev Elastic / Unlimited supply controlled via algorithmic dividend expansion.
 * Features automated transfer burn sinks, gasless EIP-2612 permit for Celo MiniPay,
 * and multi-role access control for Post-Quantum governance.
 */
contract ApexUHIToken is ERC20, ERC20Burnable, ERC20Permit, ERC20Votes, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant QUANTUM_GOV_ROLE = keccak256("QUANTUM_GOV_ROLE");
    bytes32 public constant FEE_EXEMPT_ROLE = keccak256("FEE_EXEMPT_ROLE");

    // Dynamic burn tax on transfers (30 basis points = 0.30%)
    uint256 public burnFeeBps = 30;
    uint256 public constant MAX_BURN_FEE_BPS = 500; // 5.0% absolute maximum safety limit

    // Address receiving burn or fee exemption whitelist
    mapping(address => bool) public isFeeExempt;

    event BurnFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event FeeExemptionSet(address indexed account, bool isExempt);
    event ElasticSupplyExpanded(address indexed recipient, uint256 amount, string reason);

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address defaultAdmin,
        address treasury
    ) ERC20(name, symbol) ERC20Permit(name) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(QUANTUM_GOV_ROLE, defaultAdmin);
        _grantRole(FEE_EXEMPT_ROLE, defaultAdmin);
        _grantRole(FEE_EXEMPT_ROLE, treasury);

        isFeeExempt[defaultAdmin] = true;
        isFeeExempt[treasury] = true;
        isFeeExempt[address(this)] = true;

        // Mint Genesis Supply
        _mint(treasury, initialSupply);
    }

    function setFeeExempt(address account, bool exempt) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isFeeExempt[account] = exempt;
        emit FeeExemptionSet(account, exempt);
    }

    function setBurnFeeBps(uint256 newFeeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFeeBps <= MAX_BURN_FEE_BPS, "Fee exceeds safety cap");
        emit BurnFeeUpdated(burnFeeBps, newFeeBps);
        burnFeeBps = newFeeBps;
    }

    /**
     * @notice Elastic supply expansion executed by authorized UHI Dividend contracts
     */
    function mintHighIncome(
        address to,
        uint256 amount,
        string calldata reason
    ) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
        emit ElasticSupplyExpanded(to, amount, reason);
    }

    /**
     * @dev Overrides ERC20 transfer update with automated deflationary burn sink
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Votes) {
        if (from == address(0) || to == address(0) || isFeeExempt[from] || isFeeExempt[to] || burnFeeBps == 0) {
            super._update(from, to, value);
        } else {
            uint256 burnAmount = (value * burnFeeBps) / 10000;
            uint256 netAmount = value - burnAmount;

            if (burnAmount > 0) {
                super._update(from, address(0), burnAmount); // Burn to zero address
            }
            super._update(from, to, netAmount);
        }
    }

    // Required overrides for ERC20Votes & ERC20Permit
    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
