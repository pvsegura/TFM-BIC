import { describe, expect, it } from "vitest";

import { Argon2PasswordHasher } from "./argon2-password-hasher.js";

describe("Argon2PasswordHasher", () => {
  it("produces an Argon2id hash distinct from the plaintext", async () => {
    const hasher = new Argon2PasswordHasher();

    const hash = await hasher.hash("a-good-password");

    expect(hash).not.toBe("a-good-password");
    expect(hash).toContain("$argon2id$");
  });

  it("verifies a matching password", async () => {
    const hasher = new Argon2PasswordHasher();
    const hash = await hasher.hash("a-good-password");

    expect(await hasher.verify(hash, "a-good-password")).toBe(true);
  });

  it("rejects a non-matching password", async () => {
    const hasher = new Argon2PasswordHasher();
    const hash = await hasher.hash("a-good-password");

    expect(await hasher.verify(hash, "wrong-password")).toBe(false);
  });

  it("produces a different hash for the same password each time (random salt)", async () => {
    const hasher = new Argon2PasswordHasher();

    const [first, second] = await Promise.all([
      hasher.hash("a-good-password"),
      hasher.hash("a-good-password"),
    ]);

    expect(first).not.toBe(second);
  });
});
