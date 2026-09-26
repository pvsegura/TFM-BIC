import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createTestDb, type TestDbHandle } from "./db/test-support/create-test-db.js";
import { DrizzleEmailVerificationTokenRepository } from "./email-verification-token.repository.js";
import { DrizzleUserRepository } from "./user.repository.js";

let handle: TestDbHandle;
let tokenRepository: DrizzleEmailVerificationTokenRepository;
let userRepository: DrizzleUserRepository;

beforeAll(async () => {
  handle = await createTestDb();
  tokenRepository = new DrizzleEmailVerificationTokenRepository(handle.db);
  userRepository = new DrizzleUserRepository(handle.db);
});

afterEach(async () => {
  await handle.reset();
});

afterAll(async () => {
  await handle.close();
});

async function seedUser() {
  return userRepository.create({
    email: "user@example.com",
    normalizedEmail: "user@example.com",
    passwordHash: "hashed-value",
    role: "STUDENT",
  });
}

describe("DrizzleEmailVerificationTokenRepository", () => {
  it("creates a token, initially unused", async () => {
    const user = await seedUser();

    const token = await tokenRepository.create({
      userId: user.id,
      tokenHash: "a".repeat(64),
      expiresAt: new Date("2099-01-01"),
    });

    expect(token.id).toBeTruthy();
    expect(token.usedAt).toBeNull();
  });

  it("finds a token by hash", async () => {
    const user = await seedUser();
    await tokenRepository.create({
      userId: user.id,
      tokenHash: "b".repeat(64),
      expiresAt: new Date("2099-01-01"),
    });

    expect((await tokenRepository.findByTokenHash("b".repeat(64)))?.userId).toBe(user.id);
  });

  it("returns null for an unknown token hash", async () => {
    expect(await tokenRepository.findByTokenHash("unknown")).toBeNull();
  });

  it("invalidates every outstanding token for a user, leaving already-used ones alone", async () => {
    const user = await seedUser();
    await tokenRepository.create({
      userId: user.id,
      tokenHash: "d".repeat(64),
      expiresAt: new Date("2099-01-01"),
    });
    await tokenRepository.consume("d".repeat(64), new Date("2030-01-01"));
    await tokenRepository.create({
      userId: user.id,
      tokenHash: "e".repeat(64),
      expiresAt: new Date("2099-01-01"),
    });
    const firstUsedAt = (await tokenRepository.findByTokenHash("d".repeat(64)))?.usedAt;

    await tokenRepository.invalidateAllForUser(user.id);

    expect((await tokenRepository.findByTokenHash("e".repeat(64)))?.usedAt).not.toBeNull();
    expect((await tokenRepository.findByTokenHash("d".repeat(64)))?.usedAt).toEqual(firstUsedAt);
  });
  describe("consume — atomic single use (M16, S-05)", () => {
    const NOW = new Date("2030-01-01T12:00:00Z");

    async function issue(hash: string, expiresAt = new Date("2099-01-01")) {
      const user = await seedUser();
      return tokenRepository.create({ userId: user.id, tokenHash: hash, expiresAt });
    }

    it("consumes an unused, unexpired token once and returns it", async () => {
      const token = await issue("e".repeat(64));

      const result = await tokenRepository.consume("e".repeat(64), NOW);

      expect(result.outcome).toBe("consumed");
      expect(result.outcome === "consumed" ? result.token.id : null).toBe(token.id);
      expect((await tokenRepository.findByTokenHash("e".repeat(64)))?.usedAt).toEqual(NOW);
    });

    it("refuses a second use", async () => {
      await issue("f".repeat(64));
      await tokenRepository.consume("f".repeat(64), NOW);

      expect(await tokenRepository.consume("f".repeat(64), NOW)).toEqual({
        outcome: "already_used",
      });
    });

    it("refuses an expired token and leaves it unused", async () => {
      await issue("0".repeat(64), new Date("2030-01-01T11:59:59Z"));

      expect(await tokenRepository.consume("0".repeat(64), NOW)).toEqual({ outcome: "expired" });
      expect((await tokenRepository.findByTokenHash("0".repeat(64)))?.usedAt).toBeNull();
    });

    it("treats a token expiring exactly now as expired", async () => {
      await issue("1".repeat(64), NOW);

      expect(await tokenRepository.consume("1".repeat(64), NOW)).toEqual({ outcome: "expired" });
    });

    it("reports an unknown token as not found", async () => {
      expect(await tokenRepository.consume("unknown", NOW)).toEqual({ outcome: "not_found" });
    });

    it("lets exactly one of many simultaneous uses succeed", async () => {
      await issue("2".repeat(64));

      const results = await Promise.all(
        Array.from({ length: 5 }, () => tokenRepository.consume("2".repeat(64), NOW)),
      );

      expect(results.filter((r) => r.outcome === "consumed")).toHaveLength(1);
      expect(results.filter((r) => r.outcome === "already_used")).toHaveLength(4);
    });
  });
});
