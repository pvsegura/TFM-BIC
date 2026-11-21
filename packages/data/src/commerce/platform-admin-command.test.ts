import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { PgliteTestDb } from "../db/test-support/pglite-test-db.js";
import { createVerbysiaTestDb } from "../memory/db/test-support/create-test-db.js";
import type { CommerceDb } from "./db/client.js";
import { runPlatformAdminCommand } from "./platform-admin-command.js";

let testDb: PgliteTestDb;
beforeAll(async () => {
  testDb = await createVerbysiaTestDb();
});
afterAll(async () => testDb.close());
beforeEach(async () => {
  await testDb.reset();
  await testDb.seedUser("owner@example.com");
});

describe("runPlatformAdminCommand", () => {
  it("promotes and demotes an account by email, case-insensitively", async () => {
    const db = testDb.as<CommerceDb>();
    expect(await runPlatformAdminCommand(["promote", "Owner@Example.com"], db)).toEqual({
      exitCode: 0,
      message: "Account is now ADMIN.",
    });
    expect((await runPlatformAdminCommand(["demote", "owner@example.com"], db)).exitCode).toBe(0);
  });

  it("refuses unknown accounts and bad usage", async () => {
    const db = testDb.as<CommerceDb>();
    expect((await runPlatformAdminCommand(["promote", "nobody@example.com"], db)).exitCode).toBe(1);
    expect((await runPlatformAdminCommand(["delete", "owner@example.com"], db)).exitCode).toBe(2);
  });
});
