import { defineChain } from "viem";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Base Sepolia chain definition
export const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.RPC_URL || "https://sepolia.base.org"] },
  },
  blockExplorers: {
    default: {
      name: "BaseScan",
      url: "https://sepolia.basescan.org",
    },
  },
  testnet: true,
});

// Load contract address from deploy.json if available
export function getContractAddress(): `0x${string}` {
  const envAddr = process.env.CONTRACT_ADDRESS;
  if (envAddr) return envAddr as `0x${string}`;

  const deployPath = join(ROOT, "proof", "deploy.json");
  if (existsSync(deployPath)) {
    const data = JSON.parse(readFileSync(deployPath, "utf-8"));
    return data.contractAddress as `0x${string}`;
  }

  throw new Error(
    "CONTRACT_ADDRESS not set and proof/deploy.json not found. Deploy first."
  );
}

// Load private key from env
export function getPrivateKey(): `0x${string}` {
  const key = process.env.PRIVATE_KEY;
  if (!key) throw new Error("PRIVATE_KEY environment variable is required");
  return (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`;
}

// Load compiled contract ABI + bytecode
export function loadContractArtifact(): {
  abi: any[];
  bytecode: `0x${string}`;
} {
  const artifactPath = join(ROOT, "artifacts", "WorkReceipt.json");
  if (!existsSync(artifactPath)) {
    throw new Error(
      "Contract artifact not found. Run `npm run compile` first."
    );
  }
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  return {
    abi: artifact.abi,
    bytecode: artifact.bytecode as `0x${string}`,
  };
}
