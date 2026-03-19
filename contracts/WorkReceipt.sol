// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title WorkReceipt — On-chain proof of agent work (ERC-8004 Agent Identity)
/// @notice Links agent identity to verifiable deliverables on Base
contract WorkReceipt {
    struct Receipt {
        address agent;
        bytes32 deliverableHash;
        string taskDescription;
        uint256 timestamp;
        address requester;
    }

    uint256 public nextReceiptId;
    mapping(uint256 => Receipt) public receipts;
    mapping(address => uint256[]) public agentReceiptIds;

    event ReceiptSubmitted(
        uint256 indexed receiptId,
        address indexed agent,
        bytes32 deliverableHash,
        string taskDescription,
        address requester,
        uint256 timestamp
    );

    event ReceiptVerified(
        uint256 indexed receiptId,
        address indexed verifier,
        bool matched
    );

    /// @notice Agent submits proof of completed work
    /// @param deliverableHash keccak256 hash of the deliverable content
    /// @param taskDescription Human-readable description of the task
    /// @param requester Address that requested the work
    /// @return receiptId The ID of the newly created receipt
    function submitReceipt(
        bytes32 deliverableHash,
        string calldata taskDescription,
        address requester
    ) external returns (uint256 receiptId) {
        receiptId = nextReceiptId++;

        receipts[receiptId] = Receipt({
            agent: msg.sender,
            deliverableHash: deliverableHash,
            taskDescription: taskDescription,
            timestamp: block.timestamp,
            requester: requester
        });

        agentReceiptIds[msg.sender].push(receiptId);

        emit ReceiptSubmitted(
            receiptId,
            msg.sender,
            deliverableHash,
            taskDescription,
            requester,
            block.timestamp
        );
    }

    /// @notice Get full receipt details
    /// @param receiptId The receipt to look up
    function getReceipt(uint256 receiptId)
        external
        view
        returns (
            address agent,
            bytes32 deliverableHash,
            string memory taskDescription,
            uint256 timestamp,
            address requester
        )
    {
        Receipt storage r = receipts[receiptId];
        return (r.agent, r.deliverableHash, r.taskDescription, r.timestamp, r.requester);
    }

    /// @notice Get all receipt IDs for an agent
    /// @param agent The agent address to query
    function getAgentReceipts(address agent) external view returns (uint256[] memory) {
        return agentReceiptIds[agent];
    }

    /// @notice Verify a receipt matches an expected deliverable hash
    /// @dev Emits ReceiptVerified so verification is recorded on-chain
    /// @param receiptId The receipt to verify
    /// @param expectedHash The expected deliverable hash
    /// @return matched Whether the hashes match
    function verifyReceipt(uint256 receiptId, bytes32 expectedHash)
        external
        returns (bool matched)
    {
        matched = receipts[receiptId].deliverableHash == expectedHash;
        emit ReceiptVerified(receiptId, msg.sender, matched);
    }
}
