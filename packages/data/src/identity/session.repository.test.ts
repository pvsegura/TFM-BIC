import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createTestDb, type TestDbHandle } from "./db/test-support/create-test-db.js";
import { DrizzleSessionRepository } from "./session.repository.js";
import { DrizzleUserRepository } from "./user.repository.js";

let handle: TestDbHandle;
let sessionRepository: DrizzleSessionRepository;
let userRepository: DrizzleUserRepository;

beforeAll(async () => {
  handle = await createTestDb();
  sessionRepository = new DrizzleSessionRepository(handle.db);
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

describe("DrizzleSessionRepository", () => {
  it("creates a session for a user", async () => {
    const user = await seedUser();

    const session = await sessionRepository.create({
      userId: user.id,
      tokenHash: "a".repeat(64),
      expiresAt: new Date("2099-01-01"),
    });

    expect(session.id).toBeTruthy();
    expect(session.userId).toBe(user.id);
    expect(session.rotatedAt).toBeNull();
  });

  it("finds a session by token hash", async () => {
    const user = await seedUser();
    await sessionRepository.create({
      userId: user.id,
      tokenHash: "b".repeat(64),
      expiresAt: new Date("2099-01-01"),
    });

    const found = await sessionRepository.findByTokenHash("b".repeat(64));

    expect(found?.userId).toBe(user.id);
  });

  it("returns null for an unknown token hash", async () => {
    expect(await sessionRepository.findByTokenHash("unknown-hash")).toBeNull();
  });

  it("revokes a session by id", async () => {
    const user = await seedUser();
    const session = await sessionRepository.create({
      userId: user.id,
      tokenHash: "c".repeat(64),
      expiresAt: new Date("2099-01-01"),
    });

    await sessionRepository.revoke(session.id);

    expect(await sessionRepository.findByTokenHash("c".repeat(64))).toBeNull();
  });

  it("revokes all sessions for a user", async () => {
    const user = await seedUser();
    await sessionRepository.create({
      userId: user.id,
      tokenHash: "d".repeat(64),
      expiresAt: new Date("2099-01-01"),
    });
    await sessionRepository.create({
      userId: user.id,
      tokenHash: "e".repeat(64),
      expiresAt: new Date("2099-01-01"),
    });

    await sessionRepository.revokeAllForUser(user.id);

    expect(await sessionRepository.findByTokenHash("d".repeat(64))).toBeNull();
    expect(await sessionRepository.findByTokenHash("e".repeat(64))).toBeNull();
  });

  it("cascades: deleting the user removes their sessions (FK ON DELETE CASCADE)", async () => {
    const user = await seedUser();
    await sessionRepository.create({
      userId: user.id,
      tokenHash: "f".repeat(64),
      expiresAt: new Date("2099-01-01"),
    });

    await handle.rawExecute(sql`DELETE FROM users WHERE id = ${user.id}`);

    expect(await sessionRepository.findByTokenHash("f".repeat(64))).toBeNull();
  });
});
