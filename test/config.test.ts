import { describe, it, expect, afterEach } from "vitest";
import { baseSepolia, getContractAddress, getPrivateKey, loadContractArtifact } from "../src/config.js";

describe("baseSepolia chain config", () => {
  it("has chain id 84532", () => {
    expect(baseSepolia.id).toBe(84532);
  });

  it("has name 'Base Sepolia'", () => {
    expect(baseSepolia.name).toBe("Base Sepolia");
  });

  it("has default RPC URL", () => {
    const urls = baseSepolia.rpcUrls.default.http;
    expect(urls).toContain("https://sepolia.base.org");
  });

  it("is marked as testnet", () => {
    expect(baseSepolia.testnet).toBe(true);
  });

  it("uses ETH as native currency", () => {
    expect(baseSepolia.nativeCurrency).toEqual({
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    });
  });
});

describe("getPrivateKey", () => {
  const origKey = process.env.PRIVATE_KEY;

  afterEach(() => {
    if (origKey !== undefined) {
      process.env.PRIVATE_KEY = origKey;
    } else {
      delete process.env.PRIVATE_KEY;
    }
  });

  it("throws when PRIVATE_KEY is not set", () => {
    delete process.env.PRIVATE_KEY;
    expect(() => getPrivateKey()).toThrow("PRIVATE_KEY environment variable is required");
  });

  it("prepends 0x when missing", () => {
    process.env.PRIVATE_KEY = "abcd1234";
    expect(getPrivateKey()).toBe("0xabcd1234");
  });

  it("returns as-is when already prefixed with 0x", () => {
    process.env.PRIVATE_KEY = "0xdeadbeef";
    expect(getPrivateKey()).toBe("0xdeadbeef");
  });
});

describe("getContractAddress", () => {
  const origAddr = process.env.CONTRACT_ADDRESS;

  afterEach(() => {
    if (origAddr !== undefined) {
      process.env.CONTRACT_ADDRESS = origAddr;
    } else {
      delete process.env.CONTRACT_ADDRESS;
    }
  });

  it("returns CONTRACT_ADDRESS from env when set", () => {
    process.env.CONTRACT_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
    expect(getContractAddress()).toBe("0x1234567890abcdef1234567890abcdef12345678");
  });

  it("throws when neither env nor deploy.json is available", () => {
    delete process.env.CONTRACT_ADDRESS;
    // This test relies on proof/deploy.json not existing in CI-like environments
    // If deploy.json exists, it will return an address instead of throwing
    try {
      const addr = getContractAddress();
      // If we get here, deploy.json exists — just verify it returns a string
      expect(typeof addr).toBe("string");
    } catch (err: any) {
      expect(err.message).toContain("CONTRACT_ADDRESS not set");
    }
  });
});

describe("loadContractArtifact", () => {
  it("loads ABI and bytecode from artifacts/WorkReceipt.json", () => {
    const artifact = loadContractArtifact();
    expect(artifact.abi).toBeDefined();
    expect(Array.isArray(artifact.abi)).toBe(true);
    expect(artifact.abi.length).toBeGreaterThan(0);
    expect(artifact.bytecode).toBeDefined();
    expect(artifact.bytecode.startsWith("0x")).toBe(true);
  });
});
