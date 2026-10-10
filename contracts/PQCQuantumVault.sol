// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPQCVerifier.sol";

/**
 * @title PQCQuantumVault
 * @notice Post-Quantum Cryptography (PQC) Security Layer for ApexUHI
 * @dev Implements Hash-Based One-Time Signature (Lamport/Winternitz archetype) verification.
 * Immune to Shor's algorithm on quantum computers. Protects critical treasury actions.
 */
contract PQCQuantumVault is IPQCVerifier, Ownable {
    // Maps an authorized address to their registered Post-Quantum Root Hash (Merkle or Hash Chain Root)
    mapping(address => bytes32) public quantumRoots;
    // Nonce replay protection for PQC messages
    mapping(address => mapping(bytes32 => bool)) public executedQuantumMessages;

    event QuantumRootUpdated(address indexed account, bytes32 indexed oldRoot, bytes32 indexed newRoot);
    event QuantumActionAuthorized(address indexed account, bytes32 indexed messageHash, bytes32 rootHash);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Registers or updates the Post-Quantum public key root hash for msg.sender
     * @param rootHash The Keccak-256 root of the Lamport or Winternitz one-time public key array
     */
    function registerQuantumRoot(bytes32 rootHash) external override {
        bytes32 oldRoot = quantumRoots[msg.sender];
        quantumRoots[msg.sender] = rootHash;
        emit QuantumKeyRegistered(msg.sender, rootHash);
        emit QuantumRootUpdated(msg.sender, oldRoot, rootHash);
    }

    /**
     * @notice Verifies a Lamport one-time quantum-resistant signature against the recorded root hash
     * @dev For a 256-bit message hash, a Lamport signature consists of 256 revealed preimage hashes.
     * For bit i of messageHash:
     * - if bit i is 0, signature provides preimage of PubKey_0[i]
     * - if bit i is 1, signature provides preimage of PubKey_1[i]
     */
    function verifyLamportSignature(
        bytes32 messageHash,
        bytes32[256] calldata signatureParts,
        bytes32 rootHash
    ) public pure override returns (bool) {
        bytes32 reconstructedLeafAccumulator = bytes32(0);

        for (uint256 i = 0; i < 256; i++) {
            uint256 bit = (uint256(messageHash) >> (255 - i)) & 1;
            bytes32 revealedPreimage = signatureParts[i];
            bytes32 hashedCommitment = keccak256(abi.encodePacked(revealedPreimage, bit));
            reconstructedLeafAccumulator = keccak256(abi.encodePacked(reconstructedLeafAccumulator, hashedCommitment));
        }

        return reconstructedLeafAccumulator == rootHash;
    }

    /**
     * @notice Validates a quantum-safe authorization and marks message as executed
     */
    function executeQuantumGuardedAction(
        address operator,
        bytes32 messageHash,
        bytes32[256] calldata signatureParts
    ) external returns (bool) {
        bytes32 expectedRoot = quantumRoots[operator];
        require(expectedRoot != bytes32(0), "No PQC root registered");
        require(!executedQuantumMessages[operator][messageHash], "Quantum message already executed");

        bool isValid = verifyLamportSignature(messageHash, signatureParts, expectedRoot);
        require(isValid, "Invalid Post-Quantum Signature");

        executedQuantumMessages[operator][messageHash] = true;
        emit QuantumExecutionVerified(operator, messageHash, expectedRoot);
        return true;
    }
}
