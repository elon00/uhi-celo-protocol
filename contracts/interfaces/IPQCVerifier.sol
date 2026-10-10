// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPQCVerifier {
    event QuantumKeyRegistered(address indexed account, bytes32 indexed rootHash);
    event QuantumExecutionVerified(address indexed account, bytes32 indexed messageHash, bytes32 rootHash);

    function registerQuantumRoot(bytes32 rootHash) external;
    function verifyLamportSignature(
        bytes32 messageHash,
        bytes32[256] calldata signatureParts,
        bytes32 rootHash
    ) external pure returns (bool);
}
