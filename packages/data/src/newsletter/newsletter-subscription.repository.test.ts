import {
  confirmSubscription,
  startPendingSubscription,
  unsubscribe,
  type NewsletterSubscription,
} from "@tfm-bic/domain";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createGamificationTestDb,
  type GamificationTestDbHandle,
} from "../gamification/db/test-support/create-test-db.js";
import { DrizzleNewsletterSubscriptionRepository } from "./newsletter-subscription.repository.js";

const NOW = new Date("2026-09-26T10:00:00.000Z");

let handle: GamificationTestDbHandle;
let repository: DrizzleNewsletterSubscriptionRepository;

beforeAll(async () => {
  handle = await createGamificationTestDb();
  repository = new DrizzleNewsletterSubscriptionRepository(handle.newsletterDb);
});

afterAll(async () => {
  await handle.close();
});

beforeEach(async () => {
  await handle.reset();
});

function pendingFor(userId: string, suffix = userId): NewsletterSubscription {
  return startPendingSubscription(null, {
    userId,
    unsubscribeKey: `key-${suffix}`,
    confirmationTokenHash: `hash-${suffix}`,
    consentSource: "settings",
    now: NOW,
  });
}

async function count(): Promise<number> {
  const result = await handle.rawExecute(
    sql`SELECT count(*)::int AS n FROM newsletter_subscriptions`,
  );
  return (result as { rows: { n: number }[] }).rows[0]?.n ?? -1;
}

describe("DrizzleNewsletterSubscriptionRepository (real Postgres via PGlite)", () => {
  it("returns null when a user has no record — registration never creates one", async () => {
    const userId = await handle.seedUser();

    expect(await repository.findByUserId(userId)).toBeNull();
    expect(await count()).toBe(0);
  });

  it("saves and reads back every field of a pending request", async () => {
    const userId = await handle.seedUser();
    const pending = pendingFor(userId);

    await repository.save(pending);

    expect(await repository.findByUserId(userId)).toEqual(pending);
  });

  it("upserts: one row per user across the whole lifecycle", async () => {
    const userId = await handle.seedUser();
    const pending = pendingFor(userId);
    await repository.save(pending);
    const confirmed = confirmSubscription(pending, pending.confirmationTokenHash!, NOW);
    await repository.save(confirmed);
    await repository.save(unsubscribe(confirmed, NOW));

    expect(await count()).toBe(1);
    expect((await repository.findByUserId(userId))?.status).toBe("unsubscribed");
  });

  it("finds a record by confirmation token hash and by unsubscribe key", async () => {
    const userId = await handle.seedUser();
    await repository.save(pendingFor(userId, "x"));

    expect((await repository.findByConfirmationTokenHash("hash-x"))?.userId).toBe(userId);
    expect((await repository.findByUnsubscribeKey("key-x"))?.userId).toBe(userId);
    expect(await repository.findByConfirmationTokenHash("nope")).toBeNull();
    expect(await repository.findByUnsubscribeKey("nope")).toBeNull();
  });

  it("lists only confirmed subscriptions, with the account's current email", async () => {
    const a = await handle.seedUser("a@example.com");
    const b = await handle.seedUser("b@example.com");
    const c = await handle.seedUser("c@example.com");
    const pendingA = pendingFor(a);
    await repository.save(confirmSubscription(pendingA, pendingA.confirmationTokenHash!, NOW));
    await repository.save(pendingFor(b));
    const pendingC = pendingFor(c);
    await repository.save(
      unsubscribe(confirmSubscription(pendingC, pendingC.confirmationTokenHash!, NOW), NOW),
    );

    const listed = await repository.listSubscribed();

    expect(listed.map((r) => r.email)).toEqual(["a@example.com"]);
    expect(listed[0]!.subscription.status).toBe("subscribed");
  });

  it("deletes the subscription with the account (ON DELETE CASCADE) — no orphaned marketing consent", async () => {
    const userId = await handle.seedUser();
    const pending = pendingFor(userId);
    await repository.save(confirmSubscription(pending, pending.confirmationTokenHash!, NOW));

    await handle.rawExecute(sql`DELETE FROM users WHERE id = ${userId}`);

    expect(await count()).toBe(0);
    expect(await repository.listSubscribed()).toEqual([]);
  });

  it("refuses a subscription for a user that does not exist", async () => {
    await expect(
      repository.save(pendingFor("00000000-0000-4000-8000-000000000000")),
    ).rejects.toThrow();
  });

  it("enforces unique unsubscribe keys", async () => {
    const a = await handle.seedUser();
    const b = await handle.seedUser();
    await repository.save(pendingFor(a, "same"));

    await expect(
      repository.save({ ...pendingFor(b, "other"), unsubscribeKey: "key-same" }),
    ).rejects.toThrow();
  });

  it.each([
    ["an unknown status", sql`'maybe'`, sql`NULL`, sql`NULL`, sql`NULL`],
    ["subscribed without a confirmation time", sql`'subscribed'`, sql`NULL`, sql`NULL`, sql`NULL`],
    [
      "unsubscribed without a withdrawal time",
      sql`'unsubscribed'`,
      sql`NULL`,
      sql`NULL`,
      sql`NULL`,
    ],
    ["a token without an expiry", sql`'pending'`, sql`NULL`, sql`'h'`, sql`NULL`],
    ["a live token outside pending", sql`'subscribed'`, sql`now()`, sql`'h'`, sql`now()`],
  ])("the database refuses %s", async (_label, status, confirmedAt, tokenHash, expiresAt) => {
    const userId = await handle.seedUser();
    await expect(
      handle.rawExecute(sql`
        INSERT INTO newsletter_subscriptions
          (user_id, status, unsubscribe_key, consent_version, consent_source, requested_at,
           confirmed_at, confirmation_token_hash, confirmation_expires_at, updated_at)
        VALUES (${userId}, ${status}, 'k', 'v', 'settings', now(),
          ${confirmedAt}, ${tokenHash}, ${expiresAt}, now())`),
    ).rejects.toThrow();
  });
});
