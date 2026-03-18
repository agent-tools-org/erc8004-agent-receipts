import {
  createWalletClient,
  createPublicClient,
  http,
  keccak256,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  baseSepolia,
  getPrivateKey,
  getContractAddress,
  loadContractArtifact,
} from "../config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

// Simulate an agent task: fetch data and produce a deliverable
async function performTask(): Promise<{
  deliverable: string;
  description: string;
}> {
  console.log("[Agent] Performing task: generating a data report...");

  // Simulated agent work — in production this could be API calls, computation, etc.
  const timestamp = new Date().toISOString();
  const data = {
    report: "Base Sepolia Network Status",
    generatedAt: timestamp,
    metrics: {
      blockHeight: "latest",
      networkStatus: "healthy",
      agentVersion: "1.0.0",
    },
    summary: "Agent successfully generated network status report for Base Sepolia.",
  };

  const deliverable = JSON.stringify(data, null, 2);
  console.log("[Agent] Task complete. Deliverable generated.");
  return {
    deliverable,
    description: `Network status report generated at ${timestamp}`,
  };
}

async function main() {
  const account = privateKeyToAccount(getPrivateKey());
  const contractAddress = getContractAddress();
  const { abi } = loadContractArtifact();

  console.log(`[Agent] Address: ${account.address}`);
  console.log(`[Agent] Contract: ${contractAddress}`);

  // Step 1: Perform the task
  const { deliverable, description } = await performTask();

  // Step 2: Hash the deliverable
  const deliverableHash = keccak256(toHex(deliverable));
  console.log(`[Agent] Deliverable hash: ${deliverableHash}`);

  // Step 3: Submit receipt on-chain
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  // Use the zero address as requester for this demo
  const requester = "0x0000000000000000000000000000000000000000" as const;

  console.log("[Agent] Submitting work receipt on-chain...");

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi,
    functionName: "submitReceipt",
    args: [deliverableHash, description, requester],
  });

  console.log(`[Agent] Tx hash: ${hash}`);
  console.log("[Agent] Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`[Agent] Receipt confirmed in block ${receipt.blockNumber}`);
  console.log(
    `[Agent] Explorer: https://sepolia.basescan.org/tx/${hash}`
  );

  // Save receipt proof locally
  const proofDir = join(ROOT, "proof");
  mkdirSync(proofDir, { recursive: true });

  const receiptData = {
    agent: account.address,
    deliverableHash,
    taskDescription: description,
    transactionHash: hash,
    blockNumber: Number(receipt.blockNumber),
    chainId: baseSepolia.id,
    contractAddress,
    timestamp: new Date().toISOString(),
    deliverable,
  };

  writeFileSync(
    join(proofDir, "receipt.json"),
    JSON.stringify(receiptData, null, 2)
  );
  console.log("[Agent] Receipt saved to proof/receipt.json");
}

main().catch((err) => {
  console.error("[Agent] Failed:", err.message);
  process.exit(1);
});
