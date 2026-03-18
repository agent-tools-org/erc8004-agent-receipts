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
Agent (ERC-8004 identity on Base)
  │
  ├── Performs task → produces deliverable
  ├── Hashes deliverable → bytes32
  └── Calls WorkReceipt.submitReceipt() on Base Sepolia
        │
        └── On-chain receipt: agent + hash + description + timestamp + requester

Verifier
  └── Calls WorkReceipt.verifyReceipt(id, expectedHash)
        └── Returns true/false — trustless verification
```

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

## The ERC-8004 Connection

ERC-8004 provides on-chain agent identity on Base. Our work receipts build a **verifiable track record** for that identity:

- **Identity** → ERC-8004 agent address on Base
- **Accountability** → Every task has an immutable receipt
- **Trust** → Anyone can verify an agent's claimed work output
- **Reputation** → An agent's receipt history demonstrates reliability

This creates a trust layer where agents can prove their work, and requesters can verify it — all on-chain, all trustless.

## Tech Stack

- **Solidity** — Smart contract
- **TypeScript** — Agent and verification scripts
- **viem** — Ethereum client library
- **solc** — Solidity compiler
- **Base Sepolia** — Deployment chain (Chain ID: 84532)

## License

MIT
