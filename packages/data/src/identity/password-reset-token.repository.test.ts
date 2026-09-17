import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createTestDb, type TestDbHandle } from "./db/test-support/create-test-db.js";
import { DrizzlePasswordResetTokenRepository } from "./password-reset-token.repository.js";
import { DrizzleUserRepository } from "./user.repository.js";

let handle: TestDbHandle;
let tokenRepository: DrizzlePasswordResetTokenRepository;
let userRepository: DrizzleUserRepository;

beforeAll(async () => {
  handle = await createTestDb();
  tokenRepository = new DrizzlePasswordResetTokenRepository(handle.db);
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

describe("DrizzlePasswordResetTokenRepository", () => {
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

  it("marks a token used", async () => {
    const user = await seedUser();
    const token = await tokenRepository.create({
      userId: user.id,
      tokenHash: "c".repeat(64),
      expiresAt: new Date("2099-01-01"),
    });

    await tokenRepository.markUsed(token.id);

    expect((await tokenRepository.findByTokenHash("c".repeat(64)))?.usedAt).not.toBeNull();
  });

  it("invalidates every outstanding token for a user", async () => {
    const user = await seedUser();
    await tokenRepository.create({
      userId: user.id,
      tokenHash: "d".repeat(64),
      expiresAt: new Date("2099-01-01"),
    });

    await tokenRepository.invalidateAllForUser(user.id);

    expect((await tokenRepository.findByTokenHash("d".repeat(64)))?.usedAt).not.toBeNull();
  });
});
