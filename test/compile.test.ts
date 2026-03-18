import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const artifactPath = join(ROOT, "artifacts", "WorkReceipt.json");

const artifact: { abi: any[]; bytecode: string } = JSON.parse(
  readFileSync(artifactPath, "utf-8")
);

describe("WorkReceipt ABI structure", () => {
  it("artifact file contains abi and bytecode keys", () => {
    expect(artifact).toHaveProperty("abi");
    expect(artifact).toHaveProperty("bytecode");
  });

  it("bytecode is a non-empty hex string", () => {
    expect(artifact.bytecode.startsWith("0x")).toBe(true);
    expect(artifact.bytecode.length).toBeGreaterThan(2);
  });

  it("ABI contains submitReceipt function", () => {
    const fn = artifact.abi.find(
      (entry: any) => entry.type === "function" && entry.name === "submitReceipt"
    );
    expect(fn).toBeDefined();
    expect(fn.inputs).toHaveLength(3);
    expect(fn.inputs[0].type).toBe("bytes32"); // deliverableHash
    expect(fn.inputs[1].type).toBe("string"); // taskDescription
    expect(fn.inputs[2].type).toBe("address"); // requester
    expect(fn.outputs).toHaveLength(1);
    expect(fn.outputs[0].type).toBe("uint256"); // receiptId
  });

  it("ABI contains getReceipt function", () => {
    const fn = artifact.abi.find(
      (entry: any) => entry.type === "function" && entry.name === "getReceipt"
    );
    expect(fn).toBeDefined();
    expect(fn.inputs).toHaveLength(1);
    expect(fn.inputs[0].type).toBe("uint256"); // receiptId
    expect(fn.outputs).toHaveLength(5); // agent, deliverableHash, taskDescription, timestamp, requester
  });

  it("ABI contains verifyReceipt function", () => {
    const fn = artifact.abi.find(
      (entry: any) => entry.type === "function" && entry.name === "verifyReceipt"
    );
    expect(fn).toBeDefined();
    expect(fn.inputs).toHaveLength(2);
    expect(fn.inputs[0].type).toBe("uint256"); // receiptId
    expect(fn.inputs[1].type).toBe("bytes32"); // expectedHash
    expect(fn.outputs).toHaveLength(1);
    expect(fn.outputs[0].type).toBe("bool"); // matched
  });

  it("ABI contains getAgentReceipts function", () => {
    const fn = artifact.abi.find(
      (entry: any) => entry.type === "function" && entry.name === "getAgentReceipts"
    );
    expect(fn).toBeDefined();
    expect(fn.inputs).toHaveLength(1);
    expect(fn.inputs[0].type).toBe("address"); // agent
    expect(fn.outputs).toHaveLength(1);
    expect(fn.outputs[0].type).toBe("uint256[]");
  });

  it("ABI contains ReceiptSubmitted event", () => {
    const event = artifact.abi.find(
      (entry: any) => entry.type === "event" && entry.name === "ReceiptSubmitted"
    );
    expect(event).toBeDefined();
    expect(event.inputs.length).toBe(6);
  });

  it("ABI contains ReceiptVerified event", () => {
    const event = artifact.abi.find(
      (entry: any) => entry.type === "event" && entry.name === "ReceiptVerified"
    );
    expect(event).toBeDefined();
    expect(event.inputs.length).toBe(3);
  });

  it("ABI contains nextReceiptId function", () => {
    const fn = artifact.abi.find(
      (entry: any) => entry.type === "function" && entry.name === "nextReceiptId"
    );
    expect(fn).toBeDefined();
    expect(fn.stateMutability).toBe("view");
  });

  it("all function entries have stateMutability set", () => {
    const functions = artifact.abi.filter((entry: any) => entry.type === "function");
    for (const fn of functions) {
      expect(fn.stateMutability).toBeDefined();
    }
  });
});
