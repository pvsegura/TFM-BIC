import { randomUUID } from "node:crypto";

import { createVocabularyItemId } from "@verbysia/domain";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { PgliteTestDb } from "../db/test-support/pglite-test-db.js";
import type { MemoryDb } from "./db/client.js";
import { createVerbysiaTestDb } from "./db/test-support/create-test-db.js";
import { DrizzleMemoryCardRepository } from "./memory-card.repository.js";

const HOLA = createVocabularyItemId("es-hola");
const now = new Date("2026-11-21T10:00:00.000Z");
const later = new Date("2026-11-22T10:00:00.000Z");

let testDb: PgliteTestDb;
let repo: DrizzleMemoryCardRepository;
let userId: string;

beforeAll(async () => {
  testDb = await createVerbysiaTestDb();
  repo = new DrizzleMemoryCardRepository(testDb.as<MemoryDb>());
});
afterAll(async () => testDb.close());
beforeEach(async () => {
  await testDb.reset();
  userId = await testDb.seedUser("learner@example.com");
});

const review = (
  overrides: Partial<Parameters<DrizzleMemoryCardRepository["recordReview"]>[0]> = {},
) =>
  repo.recordReview({
    userId,
    vocabularyItemId: HOLA,
    clientReviewId: randomUUID(),
    grade: "good",
    usedHint: false,
    now,
    ...overrides,
  });

describe("DrizzleMemoryCardRepository", () => {
  it("creates the card on the first answer and schedules it with SM-2", async () => {
    const { card, duplicate } = await review();

    expect(duplicate).toBe(false);
    expect(card).toMatchObject({ repetitions: 1, intervalDays: 1, version: 1, lapses: 0 });
    expect(card.dueAt.toISOString()).toBe(later.toISOString());
    expect(await repo.listByUser(userId)).toHaveLength(1);
  });

  it("advances the same card on later answers and bumps its version", async () => {
    await review();
    const { card } = await review({ now: later });

    expect(card).toMatchObject({ repetitions: 2, intervalDays: 6, version: 2 });
    expect(await repo.listReviewsSince(userId, now)).toHaveLength(2);
  });

  it("records a retried answer (same clientReviewId) only once", async () => {
    const clientReviewId = randomUUID();
    const first = await review({ clientReviewId });
    const retry = await review({ clientReviewId, grade: "again" });

    expect(retry.duplicate).toBe(true);
    expect(retry.card).toEqual(first.card);
    expect(await repo.listReviewsSince(userId, now)).toHaveLength(1);
  });

  it("keeps cards and reviews private to each learner", async () => {
    await review();
    const other = await testDb.seedUser("other@example.com");

    expect(await repo.listByUser(other)).toEqual([]);
    expect(await repo.listReviewsSince(other, now)).toEqual([]);
  });
});
