import { describe, expect, it } from "vitest";

import { CryptoTokenGenerator } from "./crypto-token-generator.js";

describe("CryptoTokenGenerator", () => {
  it("generates a non-empty, URL-safe token", () => {
    const generator = new CryptoTokenGenerator();

    const token = generator.generate();

    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates a different token on each call (CSPRNG, not predictable)", () => {
    const generator = new CryptoTokenGenerator();

    const tokens = new Set(Array.from({ length: 20 }, () => generator.generate()));

    expect(tokens.size).toBe(20);
  });

  it("hashes deterministically — the same token always hashes the same way", () => {
    const generator = new CryptoTokenGenerator();

    expect(generator.hash("same-token")).toBe(generator.hash("same-token"));
  });

  it("hashes two different tokens differently", () => {
    const generator = new CryptoTokenGenerator();

    expect(generator.hash("token-a")).not.toBe(generator.hash("token-b"));
  });

  it("hash never returns the raw token verbatim", () => {
    const generator = new CryptoTokenGenerator();

    expect(generator.hash("a-raw-token")).not.toBe("a-raw-token");
  });
});
