import { createPublicClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { baseSepolia, getPrivateKey } from "../src/config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

async function main() {
  // Load compiled artifact to get bytecode size
  const artifactPath = join(ROOT, "artifacts", "WorkReceipt.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  const compiledBytecodeSize = (artifact.bytecode.length - 2) / 2; // hex chars minus 0x prefix

  // Derive wallet from PRIVATE_KEY
  const account = privateKeyToAccount(getPrivateKey());
  console.log(`Wallet address: ${account.address}`);

  // Connect to Base Sepolia
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  const chainId = await client.getChainId();
  console.log(`Chain ID: ${chainId}`);

  const blockNumber = await client.getBlockNumber();
  console.log(`Latest block: ${blockNumber}`);

  const balance = await client.getBalance({ address: account.address });
  const balanceEth = formatEther(balance);
  console.log(`Balance: ${balanceEth} ETH`);

  console.log(
    "\nContract compiled and ready to deploy. Need Base Sepolia ETH for deployment."
  );

  // Save results to proof/demo.json
  const proofDir = join(ROOT, "proof");
  mkdirSync(proofDir, { recursive: true });

  const demoData = {
    timestamp: new Date().toISOString(),
    chainId,
    walletAddress: account.address,
    balance: balanceEth,
    compiledBytecodeSize,
  };

  writeFileSync(join(proofDir, "demo.json"), JSON.stringify(demoData, null, 2));
  console.log("\nResults saved to proof/demo.json");
}

main().catch((err) => {
  console.error("Demo failed:", err.message);
  process.exit(1);
});
