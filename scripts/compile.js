import solc from "solc";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const contractPath = join(ROOT, "contracts", "WorkReceipt.sol");
const source = readFileSync(contractPath, "utf-8");

const input = {
  language: "Solidity",
  sources: {
    "WorkReceipt.sol": { content: source },
  },
  settings: {
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"],
      },
    },
    optimizer: { enabled: true, runs: 200 },
  },
};

console.log("Compiling WorkReceipt.sol...");
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const errors = output.errors.filter((e) => e.severity === "error");
  if (errors.length > 0) {
    console.error("Compilation errors:");
    errors.forEach((e) => console.error(e.formattedMessage));
    process.exit(1);
  }
  // Print warnings
  output.errors
    .filter((e) => e.severity === "warning")
    .forEach((w) => console.warn(w.formattedMessage));
}

const contract = output.contracts["WorkReceipt.sol"]["WorkReceipt"];
const artifact = {
  abi: contract.abi,
  bytecode: `0x${contract.evm.bytecode.object}`,
};

const artifactsDir = join(ROOT, "artifacts");
mkdirSync(artifactsDir, { recursive: true });
writeFileSync(
  join(artifactsDir, "WorkReceipt.json"),
  JSON.stringify(artifact, null, 2)
);

console.log("Compiled successfully → artifacts/WorkReceipt.json");
console.log(`ABI entries: ${artifact.abi.length}`);
console.log(`Bytecode size: ${(artifact.bytecode.length - 2) / 2} bytes`);
