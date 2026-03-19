import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { type ChildProcess, spawn } from "child_process";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  keccak256,
  toHex,
  zeroAddress,
  type Address,
  type Hex,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const artifactPath = join(ROOT, "artifacts", "WorkReceipt.json");

const artifact: { abi: any[]; bytecode: Hex } = JSON.parse(
  readFileSync(artifactPath, "utf-8")
);

// Anvil default accounts (deterministic)
const ANVIL_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;
const ANVIL_ACCOUNT2_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as Hex;

const ANVIL_PORT = 18545; // Use non-standard port to avoid conflicts

const anvilChain = defineChain({
  id: 31337,
  name: "Anvil",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [`http://127.0.0.1:${ANVIL_PORT}`] },
  },
  testnet: true,
});

let anvilProcess: ChildProcess;
let contractAddress: Address;

const account = privateKeyToAccount(ANVIL_PRIVATE_KEY);
const account2 = privateKeyToAccount(ANVIL_ACCOUNT2_KEY);

const transport = http(`http://127.0.0.1:${ANVIL_PORT}`);

const publicClient = createPublicClient({
  chain: anvilChain,
  transport,
});

const walletClient = createWalletClient({
  account,
  chain: anvilChain,
  transport,
});

const walletClient2 = createWalletClient({
  account: account2,
  chain: anvilChain,
  transport,
});

function startAnvil(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const proc = spawn("anvil", ["--port", String(ANVIL_PORT)], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let started = false;
    proc.stdout!.on("data", (data: Buffer) => {
      if (!started && data.toString().includes("Listening on")) {
        started = true;
        resolve(proc);
      }
    });
    proc.on("error", reject);
    setTimeout(() => {
      if (!started) reject(new Error("Anvil did not start in time"));
    }, 10000);
  });
}

async function deployContract(): Promise<Address> {
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt.contractAddress!;
}

beforeAll(async () => {
  anvilProcess = await startAnvil();
  contractAddress = await deployContract();
}, 30000);

afterAll(() => {
  if (anvilProcess) {
    anvilProcess.kill("SIGTERM");
  }
});

// ---------------------------------------------------------------------------
// Helper to submit a receipt and return the receipt ID
// ---------------------------------------------------------------------------
async function submitReceipt(
  client: typeof walletClient,
  deliverableHash: Hex,
  taskDescription: string,
  requester: Address
): Promise<{ receiptId: bigint; txHash: Hex }> {
  const txHash = await client.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: "submitReceipt",
    args: [deliverableHash, taskDescription, requester],
  });
  const txReceipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });
  // Parse ReceiptSubmitted event to get the receiptId
  const log = txReceipt.logs[0];
  const receiptId = BigInt(log.topics[1]!);
  return { receiptId, txHash };
}

// ===========================================================================
// submitReceipt tests — various input lengths
// ===========================================================================
describe("submitReceipt", () => {
  it("submits a receipt with a normal description", async () => {
    const hash = keccak256(toHex("deliverable content"));
    const { receiptId } = await submitReceipt(
      walletClient,
      hash,
      "Fetch weather data",
      account2.address
    );

    const result = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "getReceipt",
      args: [receiptId],
    })) as [Address, Hex, string, bigint, Address];

    expect(result[0].toLowerCase()).toBe(account.address.toLowerCase());
    expect(result[1]).toBe(hash);
    expect(result[2]).toBe("Fetch weather data");
    expect(result[3]).toBeGreaterThan(0n);
    expect(result[4].toLowerCase()).toBe(account2.address.toLowerCase());
  });

  it("submits a receipt with an empty description", async () => {
    const hash = keccak256(toHex("empty desc deliverable"));
    const { receiptId } = await submitReceipt(
      walletClient,
      hash,
      "",
      account2.address
    );

    const result = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "getReceipt",
      args: [receiptId],
    })) as [Address, Hex, string, bigint, Address];

    expect(result[2]).toBe("");
  });

  it("submits a receipt with a very long description (1000 chars)", async () => {
    const longDesc = "A".repeat(1000);
    const hash = keccak256(toHex("long desc deliverable"));
    const { receiptId } = await submitReceipt(
      walletClient,
      hash,
      longDesc,
      account2.address
    );

    const result = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "getReceipt",
      args: [receiptId],
    })) as [Address, Hex, string, bigint, Address];

    expect(result[2]).toBe(longDesc);
    expect(result[2].length).toBe(1000);
  });

  it("submits a receipt with zero-address requester", async () => {
    const hash = keccak256(toHex("zero requester"));
    const { receiptId } = await submitReceipt(
      walletClient,
      hash,
      "task for no one",
      zeroAddress
    );

    const result = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "getReceipt",
      args: [receiptId],
    })) as [Address, Hex, string, bigint, Address];

    expect(result[4]).toBe(zeroAddress);
  });

  it("increments nextReceiptId after each submission", async () => {
    const idBefore = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "nextReceiptId",
    })) as bigint;

    const hash = keccak256(toHex("increment test"));
    await submitReceipt(walletClient, hash, "increment", account2.address);

    const idAfter = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "nextReceiptId",
    })) as bigint;

    expect(idAfter).toBe(idBefore + 1n);
  });

  it("emits ReceiptSubmitted event with correct data", async () => {
    const hash = keccak256(toHex("event test"));
    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "submitReceipt",
      args: [hash, "event test task", account2.address],
    });
    const txReceipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    expect(txReceipt.logs.length).toBeGreaterThanOrEqual(1);
    // Decode the ReceiptSubmitted event
    const log = txReceipt.logs[0];
    // topic[0] is event signature, topic[1] is receiptId, topic[2] is agent
    expect(log.topics.length).toBe(3); // sig + 2 indexed params
    // agent is the second indexed param
    const agentTopic = ("0x" +
      log.topics[2]!.slice(26)) as Address;
    expect(agentTopic.toLowerCase()).toBe(account.address.toLowerCase());
  });

  it("tracks agent receipt IDs via getAgentReceipts", async () => {
    const receiptsBefore = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "getAgentReceipts",
      args: [account.address],
    })) as bigint[];

    const hash = keccak256(toHex("tracking test"));
    const { receiptId } = await submitReceipt(
      walletClient,
      hash,
      "tracking",
      account2.address
    );

    const receiptsAfter = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "getAgentReceipts",
      args: [account.address],
    })) as bigint[];

    expect(receiptsAfter.length).toBe(receiptsBefore.length + 1);
    expect(receiptsAfter[receiptsAfter.length - 1]).toBe(receiptId);
  });
});

// ===========================================================================
// verifyReceipt tests — valid and invalid receipt IDs
// ===========================================================================
describe("verifyReceipt", () => {
  let testReceiptId: bigint;
  const testHash = keccak256(toHex("verify test content"));

  beforeAll(async () => {
    const { receiptId } = await submitReceipt(
      walletClient,
      testHash,
      "verify test",
      account2.address
    );
    testReceiptId = receiptId;
  });

  it("returns true for matching hash", async () => {
    const matched = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "verifyReceipt",
      args: [testReceiptId, testHash],
    })) as boolean;

    expect(matched).toBe(true);
  });

  it("returns false for non-matching hash", async () => {
    const wrongHash = keccak256(toHex("wrong content"));
    const matched = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "verifyReceipt",
      args: [testReceiptId, wrongHash],
    })) as boolean;

    expect(matched).toBe(false);
  });

  it("returns false for a non-existent receipt ID (defaults to zero hash)", async () => {
    const matched = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "verifyReceipt",
      args: [999999n, testHash],
    })) as boolean;

    expect(matched).toBe(false);
  });

  it("returns true when non-existent ID is compared against zero hash", async () => {
    const zeroHash =
      "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;
    const matched = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "verifyReceipt",
      args: [999999n, zeroHash],
    })) as boolean;

    // A non-existent receipt has a zero deliverableHash, so comparing
    // against zero hash returns true — this is expected Solidity behavior
    expect(matched).toBe(true);
  });

  it("emits ReceiptVerified event when called as a transaction", async () => {
    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "verifyReceipt",
      args: [testReceiptId, testHash],
    });
    const txReceipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    expect(txReceipt.logs.length).toBeGreaterThanOrEqual(1);
    const log = txReceipt.logs[0];
    // ReceiptVerified has 2 indexed params: receiptId, verifier
    expect(log.topics.length).toBe(3);
    const verifierTopic = ("0x" +
      log.topics[2]!.slice(26)) as Address;
    expect(verifierTopic.toLowerCase()).toBe(account.address.toLowerCase());
  });

  it("emits ReceiptVerified with matched=false for wrong hash", async () => {
    const wrongHash = keccak256(toHex("definitely wrong"));
    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "verifyReceipt",
      args: [testReceiptId, wrongHash],
    });
    const txReceipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    expect(txReceipt.logs.length).toBeGreaterThanOrEqual(1);
    // The non-indexed `matched` param is in log.data
    const data = txReceipt.logs[0].data;
    // bool false is encoded as 0x00...00
    const matchedValue = BigInt(data);
    expect(matchedValue).toBe(0n); // false
  });
});

// ===========================================================================
// Edge cases
// ===========================================================================
describe("edge cases", () => {
  it("allows submitting a receipt with a zero deliverable hash", async () => {
    const zeroHash =
      "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;
    const { receiptId } = await submitReceipt(
      walletClient,
      zeroHash,
      "zero hash task",
      account2.address
    );

    const result = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "getReceipt",
      args: [receiptId],
    })) as [Address, Hex, string, bigint, Address];

    expect(result[1]).toBe(zeroHash);
  });

  it("different agents can submit receipts independently", async () => {
    const hash1 = keccak256(toHex("agent1 work"));
    const hash2 = keccak256(toHex("agent2 work"));

    await submitReceipt(walletClient, hash1, "agent1 task", zeroAddress);
    await submitReceipt(walletClient2, hash2, "agent2 task", zeroAddress);

    const agent1Receipts = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "getAgentReceipts",
      args: [account.address],
    })) as bigint[];

    const agent2Receipts = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "getAgentReceipts",
      args: [account2.address],
    })) as bigint[];

    expect(agent1Receipts.length).toBeGreaterThan(0);
    expect(agent2Receipts.length).toBeGreaterThan(0);
  });

  it("handles unicode in task description", async () => {
    const hash = keccak256(toHex("unicode test"));
    const unicodeDesc = "分析数据 📊 — résumé élève";
    const { receiptId } = await submitReceipt(
      walletClient,
      hash,
      unicodeDesc,
      account2.address
    );

    const result = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "getReceipt",
      args: [receiptId],
    })) as [Address, Hex, string, bigint, Address];

    expect(result[2]).toBe(unicodeDesc);
  });

  it("getReceipt for non-existent ID returns zero values", async () => {
    const result = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "getReceipt",
      args: [999999n],
    })) as [Address, Hex, string, bigint, Address];

    expect(result[0]).toBe(zeroAddress); // agent is zero address
    expect(result[2]).toBe(""); // empty description
    expect(result[3]).toBe(0n); // zero timestamp
    expect(result[4]).toBe(zeroAddress); // zero requester
  });

  it("getAgentReceipts for unknown agent returns empty array", async () => {
    const randomAddr = "0x0000000000000000000000000000000000000001" as Address;
    const receipts = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "getAgentReceipts",
      args: [randomAddr],
    })) as bigint[];

    expect(receipts).toEqual([]);
  });
});

// ===========================================================================
// ABI: ReceiptVerified event definition
// ===========================================================================
describe("ReceiptVerified event ABI", () => {
  it("event exists in ABI with correct structure", () => {
    const event = artifact.abi.find(
      (entry: any) => entry.type === "event" && entry.name === "ReceiptVerified"
    );
    expect(event).toBeDefined();
    expect(event.inputs).toHaveLength(3);

    const [receiptIdInput, verifierInput, matchedInput] = event.inputs;
    expect(receiptIdInput.name).toBe("receiptId");
    expect(receiptIdInput.type).toBe("uint256");
    expect(receiptIdInput.indexed).toBe(true);

    expect(verifierInput.name).toBe("verifier");
    expect(verifierInput.type).toBe("address");
    expect(verifierInput.indexed).toBe(true);

    expect(matchedInput.name).toBe("matched");
    expect(matchedInput.type).toBe("bool");
    expect(matchedInput.indexed).toBe(false);
  });

  it("verifyReceipt is now nonpayable (emits event)", () => {
    const fn = artifact.abi.find(
      (entry: any) => entry.type === "function" && entry.name === "verifyReceipt"
    );
    expect(fn).toBeDefined();
    expect(fn.stateMutability).toBe("nonpayable");
  });
});
