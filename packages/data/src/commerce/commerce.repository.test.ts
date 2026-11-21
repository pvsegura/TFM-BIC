import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { PgliteTestDb } from "../db/test-support/pglite-test-db.js";
import { createVerbysiaTestDb } from "../memory/db/test-support/create-test-db.js";
import { createCommerceRepositories, type CommerceRepositories } from "./commerce.repository.js";
import type { CommerceDb } from "./db/client.js";

const now = new Date("2026-11-21T10:00:00.000Z");

let testDb: PgliteTestDb;
let repos: CommerceRepositories;
let userId: string;

beforeAll(async () => {
  testDb = await createVerbysiaTestDb();
  repos = createCommerceRepositories(testDb.as<CommerceDb>());
});
afterAll(async () => testDb.close());
beforeEach(async () => {
  await testDb.reset();
  userId = await testDb.seedUser("buyer@example.com");
});

describe("commerce repositories", () => {
  it("ships the launch catalogue: A1 and Premium active, A2-B2 draft, nothing purchasable yet", async () => {
    const products = await repos.products.list();

    expect(products.map((p) => [p.id, p.status])).toEqual([
      ["premium-monthly", "active"],
      ["premium-yearly", "active"],
      ["course-a1", "active"],
      ["course-a2", "draft"],
      ["course-b1", "draft"],
      ["course-b2", "draft"],
    ]);
    expect(products.every((p) => p.providerPriceId === null && p.currency === "PLN")).toBe(true);
  });

  it("updates a product's price and status", async () => {
    const updated = await repos.products.update("course-a1", { priceMinor: 12900 }, now);

    expect(updated).toMatchObject({ priceMinor: 12900, updatedAt: now });
    expect(await repos.products.update("missing", { priceMinor: 1 }, now)).toBeNull();
  });

  it("grants and revokes licences, keeping the first revocation time", async () => {
    const licence = await repos.licences.grant({
      userId,
      kind: "COURSE_A1",
      startsAt: now,
      endsAt: null,
      source: "admin",
      sourceId: null,
      note: "test",
      createdAt: now,
    });
    const revoked = await repos.licences.revoke(licence.id, now);
    const again = await repos.licences.revoke(licence.id, new Date("2027-01-01T00:00:00.000Z"));

    expect(revoked?.revokedAt).toEqual(now);
    expect(again?.revokedAt).toEqual(now);
    expect(await repos.licences.listByUser(userId)).toHaveLength(1);
  });

  it("searches users by email literally (LIKE metacharacters are escaped)", async () => {
    await testDb.seedUser("ana_lopez@example.com");

    expect((await repos.users.search("buyer", 10, 0)).users.map((u) => u.email)).toEqual([
      "buyer@example.com",
    ]);
    expect((await repos.users.search("%", 10, 0)).total).toBe(0);
    expect((await repos.users.search("", 10, 0)).total).toBe(2);
  });

  it("appends to the admin audit log", async () => {
    await repos.audit.record({
      actorUserId: userId,
      action: "licence.granted",
      targetType: "user",
      targetId: userId,
      details: { kind: "COURSE_A1" },
      createdAt: now,
    });

    expect(await repos.audit.listRecent(10)).toMatchObject([{ action: "licence.granted" }]);
  });
});
