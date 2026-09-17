import { DuplicateEmailError } from "@tfm-bic/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createTestDb, type TestDbHandle } from "./db/test-support/create-test-db.js";
import { DrizzleUserRepository } from "./user.repository.js";

let handle: TestDbHandle;
let repository: DrizzleUserRepository;

beforeAll(async () => {
  handle = await createTestDb();
  repository = new DrizzleUserRepository(handle.db);
});

afterEach(async () => {
  await handle.reset();
});

afterAll(async () => {
  await handle.close();
});

describe("DrizzleUserRepository", () => {
  it("creates a user and assigns id/timestamps", async () => {
    const user = await repository.create({
      email: "User@Example.com",
      normalizedEmail: "user@example.com",
      passwordHash: "hashed-value",
      role: "STUDENT",
    });

    expect(user.id).toBeTruthy();
    expect(user.email).toBe("User@Example.com");
    expect(user.normalizedEmail).toBe("user@example.com");
    expect(user.emailVerified).toBe(false);
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it("enforces normalized-email uniqueness at the database level", async () => {
    await repository.create({
      email: "user@example.com",
      normalizedEmail: "user@example.com",
      passwordHash: "hashed-value",
      role: "STUDENT",
    });

    await expect(
      repository.create({
        email: "USER@EXAMPLE.COM",
        normalizedEmail: "user@example.com",
        passwordHash: "another-hash",
        role: "STUDENT",
      }),
    ).rejects.toThrow(DuplicateEmailError);
  });

  it("finds a user by id", async () => {
    const created = await repository.create({
      email: "user@example.com",
      normalizedEmail: "user@example.com",
      passwordHash: "hashed-value",
      role: "TEACHER",
    });

    const found = await repository.findById(created.id);

    expect(found?.id).toBe(created.id);
    expect(found?.role).toBe("TEACHER");
  });

  it("returns null when finding a nonexistent id", async () => {
    expect(await repository.findById("00000000-0000-4000-8000-000000000000")).toBeNull();
  });

  it("finds a user by normalized email", async () => {
    await repository.create({
      email: "User@Example.com",
      normalizedEmail: "user@example.com",
      passwordHash: "hashed-value",
      role: "STUDENT",
    });

    const found = await repository.findByNormalizedEmail("user@example.com");

    expect(found?.email).toBe("User@Example.com");
  });

  it("returns null when finding a nonexistent normalized email", async () => {
    expect(await repository.findByNormalizedEmail("nobody@example.com")).toBeNull();
  });

  it("updates the password hash", async () => {
    const created = await repository.create({
      email: "user@example.com",
      normalizedEmail: "user@example.com",
      passwordHash: "old-hash",
      role: "STUDENT",
    });

    await repository.updatePasswordHash(created.id, "new-hash");

    expect((await repository.findById(created.id))?.passwordHash).toBe("new-hash");
  });

  it("marks the email verified", async () => {
    const created = await repository.create({
      email: "user@example.com",
      normalizedEmail: "user@example.com",
      passwordHash: "hashed-value",
      role: "STUDENT",
    });

    await repository.markEmailVerified(created.id);

    expect((await repository.findById(created.id))?.emailVerified).toBe(true);
  });
});
