# Agent Work Receipts — ERC-8004

On-chain proof of agent work linked to verifiable identity on Base.

**Hackathon Track:** Agents With Receipts — ERC-8004 (Protocol Labs)

## Overview

ERC-8004 establishes on-chain agent identity on Base. This project extends that identity with **verifiable work receipts** — cryptographic proof that an agent completed a specific task.

**How it works:**
1. An agent performs a task (data fetch, computation, report generation)
2. The agent hashes the deliverable with keccak256
3. The agent submits a work receipt on-chain linking its identity to the deliverable hash
4. Anyone can verify the receipt — proving the agent produced the claimed output

## Architecture

```
┌─────────────────────────────┐
│         AI Agent            │
│   (ERC-8004 Identity)       │
│                             │
│  1. Performs task            │
│  2. Hashes deliverable      │
│  3. Signs & submits receipt  │
└────────────┬────────────────┘
             │  submitReceipt(hash, desc, requester)
             ▼
┌─────────────────────────────┐
│   WorkReceipt Contract      │
│     (Base Sepolia)          │
│                             │
│  • Stores receipts on-chain │
│  • Links agent identity     │
│    to deliverable hash      │
│  • Emits ReceiptSubmitted   │
└────────────┬────────────────┘
             │  verifyReceipt(id, expectedHash)
             ▼
┌─────────────────────────────┐
│    On-chain Verification    │
│                             │
│  • Anyone can verify        │
│  • Trustless hash matching  │
│  • Returns true/false       │
└─────────────────────────────┘
```

The flow is simple: **Agent → Work Receipt Contract → On-chain Verification**. An agent with an ERC-8004 identity performs work, submits a receipt linking its identity to the deliverable hash, and anyone can verify that receipt on-chain without trusting the agent.

## Quick Start

```bash
# Install dependencies
npm install

# Compile the contract
npm run compile

# Set up environment
cp .env.example .env
# Edit .env with your private key (needs Base Sepolia ETH)

# Deploy to Base Sepolia
npm run deploy

# Run the agent (submits a work receipt)
npm run agent

# Verify a receipt
npm run verify -- 0 <deliverableHash>
```

## Project Structure

```
contracts/
  WorkReceipt.sol       — Solidity contract for work receipts
src/
  config.ts             — Chain config, contract loading
  deploy.ts             — Deploy script for Base Sepolia
  verify.ts             — Verification script
  agent/
    receipt-agent.ts    — Agent that performs work and submits receipts
proof/
  deploy.json           — Deployment info (after deploy)
  receipt.json          — Receipt proof (after agent run)
artifacts/
  WorkReceipt.json      — Compiled ABI + bytecode
```

## Smart Contract

**WorkReceipt.sol** stores receipts with:
- `agent` — the agent's address (ERC-8004 identity)
- `deliverableHash` — keccak256 of the work output
- `taskDescription` — human-readable task summary
- `timestamp` — when the receipt was submitted
- `requester` — who requested the work

Key functions:
- `submitReceipt(hash, description, requester)` — agent submits proof of work
- `getReceipt(id)` — read receipt details
- `getAgentReceipts(agent)` — all receipts for an agent
- `verifyReceipt(id, expectedHash)` — verify deliverable matches

## ERC-8004 Agent Identity

ERC-8004 is a standard for establishing **on-chain agent identity** on Base. Rather than treating AI agents as anonymous callers, ERC-8004 gives each agent a persistent, verifiable identity tied to a blockchain address. This identity becomes the foundation for accountability and trust.

Our work receipts extend that identity with a **verifiable track record**:

- **Identity** → Each agent has an ERC-8004 address on Base, serving as its persistent on-chain identity
- **Accountability** → Every task the agent performs produces an immutable receipt linked to that identity
- **Trust** → Anyone can verify an agent's claimed work output by checking the deliverable hash on-chain
- **Reputation** → An agent's receipt history demonstrates reliability — the more verified receipts, the more trustworthy the agent

This creates a trust layer where agents can prove their work, requesters can verify it, and the entire history is transparent — all on-chain, all trustless.

## How It Works

### Receipt Submission

1. An agent performs a task (e.g., data analysis, code generation, report creation)
2. The agent computes a `keccak256` hash of the deliverable content
3. The agent calls `submitReceipt(deliverableHash, taskDescription, requester)` on the WorkReceipt contract
4. The contract stores the receipt with the agent's address, hash, description, timestamp, and requester
5. A `ReceiptSubmitted` event is emitted for off-chain indexing

### Verification Flow

1. A verifier obtains the deliverable and the receipt ID
2. The verifier hashes the deliverable with `keccak256` to get the expected hash
3. The verifier calls `verifyReceipt(receiptId, expectedHash)` on the contract
4. The contract compares the stored hash with the expected hash and returns `true` or `false`
5. No trust required — the verification is purely cryptographic and on-chain

### Querying Receipts

- `getReceipt(id)` — Returns full receipt details (agent, hash, description, timestamp, requester)
- `getAgentReceipts(agent)` — Returns all receipt IDs for a given agent address
- `nextReceiptId()` — Returns the total number of receipts submitted

## Deployment

### Prerequisites

- Node.js 18+
- A wallet with Base Sepolia ETH ([faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet))

### Step-by-step

```bash
# 1. Install dependencies
npm install

# 2. Compile the contract
npm run compile

# 3. Set up environment variables
cp .env.example .env
# Edit .env and add your PRIVATE_KEY (needs Base Sepolia ETH)

# 4. Run the demo to verify connectivity
npm run demo
# This connects to Base Sepolia, shows your wallet address/balance,
# and confirms the contract is compiled and ready

# 5. Deploy to Base Sepolia
npm run deploy
# Deploys the WorkReceipt contract and saves address to proof/deploy.json

# 6. Submit a work receipt
npm run agent
# The agent performs a task, hashes the output, and submits a receipt on-chain

# 7. Verify a receipt
npm run verify -- 0 <deliverableHash>
# Verifies that receipt ID 0 matches the given hash
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Private key for the deployer/agent wallet |
| `CONTRACT_ADDRESS` | (Optional) Override contract address instead of reading from proof/deploy.json |
| `RPC_URL` | (Optional) Custom RPC endpoint, defaults to `https://sepolia.base.org` |

## Tech Stack

- **Solidity** — Smart contract
- **TypeScript** — Agent and verification scripts
- **viem** — Ethereum client library
- **solc** — Solidity compiler
- **Base Sepolia** — Deployment chain (Chain ID: 84532)

## License

MIT
