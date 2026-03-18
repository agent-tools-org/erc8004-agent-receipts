import { createPublicClient, http } from "viem";
import {
  baseSepolia,
  getContractAddress,
  loadContractArtifact,
} from "./config.js";

async function main() {
  const receiptId = process.argv[2];
  const expectedHash = process.argv[3];

  if (!receiptId || !expectedHash) {
    console.log("Usage: npm run verify -- <receiptId> <expectedDeliverableHash>");
    console.log("Example: npm run verify -- 0 0xabc123...");
    process.exit(1);
  }

  const contractAddress = getContractAddress();
  const { abi } = loadContractArtifact();

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  console.log(`Verifying receipt #${receiptId}...`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`Expected hash: ${expectedHash}`);

  // Fetch the receipt details
  const [agent, deliverableHash, taskDescription, timestamp, requester] =
    (await publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "getReceipt",
      args: [BigInt(receiptId)],
    })) as [string, string, string, bigint, string];

  console.log("\n--- Receipt Details ---");
  console.log(`Agent:       ${agent}`);
  console.log(`Deliverable: ${deliverableHash}`);
  console.log(`Task:        ${taskDescription}`);
  console.log(`Timestamp:   ${new Date(Number(timestamp) * 1000).toISOString()}`);
  console.log(`Requester:   ${requester}`);

  // Verify on-chain
  const matched = (await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: "verifyReceipt",
    args: [BigInt(receiptId), expectedHash as `0x${string}`],
  })) as boolean;

  console.log("\n--- Verification Result ---");
  if (matched) {
    console.log("✅ VERIFIED — Deliverable hash matches the on-chain receipt.");
    console.log("The agent's work is cryptographically proven.");
  } else {
    console.log("❌ MISMATCH — The provided hash does not match the receipt.");
    console.log(`On-chain:  ${deliverableHash}`);
    console.log(`Expected:  ${expectedHash}`);
  }
}

main().catch((err) => {
  console.error("Verification failed:", err.message);
  process.exit(1);
});
