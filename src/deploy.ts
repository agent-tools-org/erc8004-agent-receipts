import {
  createWalletClient,
  createPublicClient,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { baseSepolia, getPrivateKey, loadContractArtifact } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

async function main() {
  const account = privateKeyToAccount(getPrivateKey());
  const { abi, bytecode } = loadContractArtifact();

  console.log(`Deploying WorkReceipt from ${account.address}...`);
  console.log(`Chain: Base Sepolia (${baseSepolia.id})`);

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  // Deploy contract
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [],
  });

  console.log(`Deploy tx: ${hash}`);
  console.log("Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress!;

  console.log(`WorkReceipt deployed at: ${contractAddress}`);
  console.log(
    `Explorer: https://sepolia.basescan.org/address/${contractAddress}`
  );

  // Save to proof/deploy.json
  const proofDir = join(ROOT, "proof");
  mkdirSync(proofDir, { recursive: true });

  const deployData = {
    contractAddress,
    deployer: account.address,
    transactionHash: hash,
    chainId: baseSepolia.id,
    blockNumber: Number(receipt.blockNumber),
    timestamp: new Date().toISOString(),
  };

  writeFileSync(
    join(proofDir, "deploy.json"),
    JSON.stringify(deployData, null, 2)
  );
  console.log("Deploy info saved to proof/deploy.json");
}

main().catch((err) => {
  console.error("Deploy failed:", err.message);
  process.exit(1);
});
