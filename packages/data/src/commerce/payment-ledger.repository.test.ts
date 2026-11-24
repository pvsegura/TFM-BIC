import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { PgliteTestDb } from "../db/test-support/pglite-test-db.js";
import { createVerbysiaTestDb } from "../memory/db/test-support/create-test-db.js";
import type { CommerceDb } from "./db/client.js";
import { createPaymentLedger } from "./payment-ledger.repository.js";

const now = new Date("2026-11-24T10:00:00.000Z");
let testDb: PgliteTestDb;
let userId: string;

beforeAll(async () => {
  testDb = await createVerbysiaTestDb();
});
afterAll(async () => testDb.close());
beforeEach(async () => {
  await testDb.reset();
  userId = await testDb.seedUser("payer@example.com");
});

describe("payment ledger (Postgres)", () => {
  it("records events, customers and purchases idempotently by provider reference", async () => {
    const ledger = createPaymentLedger(testDb.as<CommerceDb>());

    expect(await ledger.hasEvent("stripe", "evt_1")).toBe(false);
    await ledger.recordEvent("stripe", "evt_1", "checkout_completed", now);
    await ledger.recordEvent("stripe", "evt_1", "checkout_completed", now);
    expect(await ledger.hasEvent("stripe", "evt_1")).toBe(true);

    await ledger.saveCustomerRef(userId, "stripe", "cus_1", now);
    await ledger.saveCustomerRef(userId, "stripe", "cus_other", now);
    expect(await ledger.findCustomerRef(userId, "stripe")).toBe("cus_1");

    const input = {
      userId,
      productId: "course-a1",
      amountMinor: 14900,
      currency: "PLN",
      provider: "stripe",
      providerRef: "pi_1",
      createdAt: now,
      paidAt: now,
    };
    const first = await ledger.createPaidPurchase(input);
    const again = await ledger.createPaidPurchase(input);
    expect(again.id).toBe(first.id);

    const sub = await ledger.upsertSubscription(
      {
        userId,
        productId: "premium-monthly",
        status: "active",
        currentPeriodEnd: now,
        cancelAtPeriodEnd: false,
        provider: "stripe",
        providerRef: "sub_1",
        updatedAt: now,
      },
      now,
    );
    const updated = await ledger.upsertSubscription(
      {
        userId,
        productId: "premium-monthly",
        status: "past_due",
        currentPeriodEnd: now,
        cancelAtPeriodEnd: true,
        provider: "stripe",
        providerRef: "sub_1",
        updatedAt: now,
      },
      now,
    );
    expect(updated.id).toBe(sub.id);
    expect(updated).toMatchObject({ status: "past_due", cancelAtPeriodEnd: true });
  });
});
