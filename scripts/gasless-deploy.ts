import {
  createWalletClient,
  createPublicClient,
  http,
  defineChain,
  keccak256,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const statusSepolia = defineChain({
  id: 1660990954,
  name: "Status Network Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://public.sepolia.rpc.status.network"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://sepoliascan.status.network",
    },
  },
});

function getPrivateKey(): `0x${string}` {
  const key = process.env.PRIVATE_KEY;
  if (!key) throw new Error("PRIVATE_KEY environment variable is required");
  return (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`;
}

async function main() {
  const account = privateKeyToAccount(getPrivateKey());

  const artifactPath = join(ROOT, "artifacts", "WorkReceipt.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  const { abi, bytecode } = artifact;

  console.log(`Deploying WorkReceipt from ${account.address}...`);
  console.log(`Chain: ${statusSepolia.name} (${statusSepolia.id})`);

  const walletClient = createWalletClient({
    account,
    chain: statusSepolia,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain: statusSepolia,
    transport: http(),
  });

  // Deploy contract with gasPrice: 0n (gasless chain)
  const deployHash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [],
    gasPrice: 0n,
  });

  console.log(`Deploy tx: ${deployHash}`);
  console.log("Waiting for confirmation...");

  const deployReceipt = await publicClient.waitForTransactionReceipt({
    hash: deployHash,
  });
  const contractAddress = deployReceipt.contractAddress!;

  console.log(`WorkReceipt deployed at: ${contractAddress}`);
  console.log(
    `Explorer: ${statusSepolia.blockExplorers.default.url}/address/${contractAddress}`
  );

  // Submit a test receipt
  const deliverableHash = keccak256(toHex("hackathon-demo-receipt"));
  const taskDescription =
    "Synthesis Hackathon — ERC-8004 Agent Work Receipt Demo";

  console.log("\nSubmitting test receipt...");
  const actionHash = await walletClient.writeContract({
    address: contractAddress,
    abi,
    functionName: "submitReceipt",
    args: [deliverableHash, taskDescription, account.address],
    gasPrice: 0n,
  });

  console.log(`Action tx: ${actionHash}`);
  const actionReceipt = await publicClient.waitForTransactionReceipt({
    hash: actionHash,
  });
  console.log(`Receipt submitted in block ${actionReceipt.blockNumber}`);

  // Save proof
  const proofDir = join(ROOT, "proof");
  mkdirSync(proofDir, { recursive: true });

  const proofData = {
    deployer: account.address,
    contractAddress,
    deployTxHash: deployHash,
    deployBlock: Number(deployReceipt.blockNumber),
    actionTxHash: actionHash,
    actionBlock: Number(actionReceipt.blockNumber),
    gasUsed: Number(deployReceipt.gasUsed + actionReceipt.gasUsed),
    effectiveGasPrice: Number(deployReceipt.effectiveGasPrice),
    explorerUrl: `${statusSepolia.blockExplorers.default.url}/address/${contractAddress}`,
    network: statusSepolia.name,
    chainId: statusSepolia.id,
    timestamp: new Date().toISOString(),
  };

  writeFileSync(
    join(proofDir, "gasless-deploy.json"),
    JSON.stringify(proofData, null, 2)
  );

  console.log("\nProof saved to proof/gasless-deploy.json");
  console.log(JSON.stringify(proofData, null, 2));
}

main().catch((err) => {
  console.error("Gasless deploy failed:", err.message);
  process.exit(1);
});
