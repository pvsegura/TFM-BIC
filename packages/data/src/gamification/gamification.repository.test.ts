import { AwardRewardsUseCase, type RewardTrigger } from "@tfm-bic/application";
import { FixedClock } from "@tfm-bic/application/testing";
import {
  createAchievementKey,
  createContentId,
  createDefaultAchievementRegistry,
  createExerciseId,
  type NewPointTransaction,
} from "@tfm-bic/domain";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createGamificationTestDb,
  type GamificationTestDbHandle,
} from "./db/test-support/create-test-db.js";
import { DrizzleGamificationRepository } from "./gamification.repository.js";

/**
 * Against a real (WASM) Postgres with every migration applied, so the constraints, the foreign
 * keys, the immutability trigger, the aggregate and paging queries and the transaction behaviour
 * are proved, not assumed. PGlite serialises queries on its single connection, so the per-student
 * advisory lock cannot be shown to *block* here; what is proved is the part the database owns
 * regardless — the unique identity, the rollback and the "exactly once" outcome under concurrent
 * callers. (The genuinely multi-connection check is the opt-in test in
 * gamification.repository.postgres.test.ts.)
 */
let handle: GamificationTestDbHandle;
let repository: DrizzleGamificationRepository;
let ana: string;
let ben: string;

beforeAll(async () => {
  handle = await createGamificationTestDb();
  repository = new DrizzleGamificationRepository(handle.db);
});

afterAll(async () => {
  await handle.close();
});

beforeEach(async () => {
  await handle.reset();
  ana = await handle.seedUser("ana@example.com");
  ben = await handle.seedUser("ben@example.com");
});

const T0 = new Date("2026-01-01T10:00:00.000Z");
const key = createAchievementKey;

function reward(
  userId: string,
  sourceId: string,
  overrides: Partial<NewPointTransaction> = {},
): NewPointTransaction {
  return {
    userId,
    amount: 10,
    reason: "exercise-completed",
    sourceId,
    createdAt: T0,
    ...overrides,
  };
}

async function count(table: string): Promise<number> {
  const result = await handle.rawExecute(sql`SELECT count(*)::int AS n FROM ${sql.raw(table)}`);
  return (result as { rows: { n: number }[] }).rows[0]?.n ?? -1;
}

async function rejection(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    // Drizzle wraps the driver error; the constraint name is in the cause chain.
    const parts: string[] = [];
    for (let e: unknown = error; e instanceof Error; e = e.cause) {
      parts.push(e.message);
    }
    return parts.join(" | ");
  }
  return "";
}

describe("recording points", () => {
  it("stores a transaction and returns it with its assigned id", async () => {
    const stored = await repository.recordPoints(reward(ana, "pl-greetings-hello"));

    expect(stored).toEqual({
      id: 1,
      userId: ana,
      amount: 10,
      reason: "exercise-completed",
      sourceId: "pl-greetings-hello",
      createdAt: T0,
    });
  });

  it("assigns ascending ids", async () => {
    const first = await repository.recordPoints(reward(ana, "pl-a"));
    const second = await repository.recordPoints(reward(ana, "pl-b"));

    expect(second?.id).toBeGreaterThan(first?.id ?? Number.POSITIVE_INFINITY);
  });

  it("is idempotent by identity: the same student, reason and source writes nothing the second time", async () => {
    await repository.recordPoints(reward(ana, "pl-a"));

    const again = await repository.recordPoints(reward(ana, "pl-a", { createdAt: new Date() }));

    expect(again).toBeNull();
    expect(await count("point_transactions")).toBe(1);
  });

  it("keeps the first payout untouched when a duplicate names a different amount", async () => {
    await repository.recordPoints(reward(ana, "pl-a", { amount: 10 }));

    await repository.recordPoints(reward(ana, "pl-a", { amount: 999 }));

    const rows = await handle.rawExecute(sql`SELECT amount FROM point_transactions`);
    expect((rows as { rows: { amount: number }[] }).rows).toEqual([{ amount: 10 }]);
  });

  it("treats another reason, another source or another student as a different reward", async () => {
    await repository.recordPoints(reward(ana, "pl-a"));

    const otherReason = await repository.recordPoints(
      reward(ana, "pl-a", { reason: "lesson-completed", amount: 25 }),
    );
    const otherSource = await repository.recordPoints(reward(ana, "pl-b"));
    const otherStudent = await repository.recordPoints(reward(ben, "pl-a"));

    expect([otherReason, otherSource, otherStudent].every((t) => t !== null)).toBe(true);
    expect(await count("point_transactions")).toBe(4);
  });

  it("pays once when the same reward is recorded by many callers at the same time", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => repository.recordPoints(reward(ana, "pl-a"))),
    );

    expect(results.filter((r) => r !== null)).toHaveLength(1);
    expect(await count("point_transactions")).toBe(1);
  });
});

describe("the ledger's constraints", () => {
  it.each([
    ["a zero amount", { amount: 0 }, "point_transactions_amount_valid"],
    ["a negative amount", { amount: -10 }, "point_transactions_amount_valid"],
    ["an amount over the sanity bound", { amount: 10_001 }, "point_transactions_amount_valid"],
    ["an unknown reason", { reason: "bonus" as never }, "point_transactions_reason_valid"],
    ["a malformed source id", { sourceId: "Bad Id; DROP" }, "point_transactions_source_id_valid"],
    [
      "an over-long source id",
      { sourceId: `a${"-b".repeat(40)}` },
      "point_transactions_source_id_valid",
    ],
  ])("refuses %s, whatever the application sends", async (_name, override, constraint) => {
    const message = await rejection(repository.recordPoints(reward(ana, "pl-a", override)));

    expect(message).toContain(constraint);
    expect(await count("point_transactions")).toBe(0);
  });

  it("refuses points for a student that does not exist", async () => {
    const message = await rejection(
      repository.recordPoints(reward("00000000-0000-4000-8000-000000000000", "pl-a")),
    );

    expect(message).toContain("point_transactions_user_id_users_id_fk");
  });

  it("refuses to edit a transaction, so history cannot be rewritten", async () => {
    await repository.recordPoints(reward(ana, "pl-a"));

    const message = await rejection(
      handle.rawExecute(sql`UPDATE point_transactions SET amount = 9999 WHERE user_id = ${ana}`),
    );

    expect(message).toContain("immutable");
    const rows = await handle.rawExecute(sql`SELECT amount FROM point_transactions`);
    expect((rows as { rows: { amount: number }[] }).rows).toEqual([{ amount: 10 }]);
  });

  it("exposes no way to update or delete a transaction", () => {
    const methods = [
      DrizzleGamificationRepository.prototype,
      Object.getPrototypeOf(DrizzleGamificationRepository.prototype) as object,
    ].flatMap((prototype) => Object.getOwnPropertyNames(prototype));

    expect(methods.filter((m) => /update|delete|remove|edit|set/i.test(m))).toEqual([]);
  });

  it("removes a student's points and unlocks with the student, and no one else's", async () => {
    await repository.recordPoints(reward(ana, "pl-a"));
    await repository.recordPoints(reward(ben, "pl-a"));
    await repository.recordUnlock({
      userId: ana,
      achievementKey: key("first-exercise"),
      unlockedAt: T0,
    });

    await handle.rawExecute(sql`DELETE FROM users WHERE id = ${ana}`);

    expect(await count("point_transactions")).toBe(1);
    expect(await count("user_achievements")).toBe(0);
  });
});

describe("what the ledger says about a student", () => {
  it("is all zeros for a student with no rewards", async () => {
    expect(await repository.loadFacts(ana)).toEqual({
      totalPoints: 0,
      rewardCounts: { "exercise-completed": 0, "lesson-completed": 0, "achievement-unlocked": 0 },
    });
  });

  it("sums the points and counts the rewards per reason, from the student's own rows only", async () => {
    await repository.recordPoints(reward(ana, "pl-a"));
    await repository.recordPoints(reward(ana, "pl-b"));
    await repository.recordPoints(
      reward(ana, "pl-lesson", { reason: "lesson-completed", amount: 25 }),
    );
    await repository.recordPoints(
      reward(ana, "first-exercise", { reason: "achievement-unlocked", amount: 50 }),
    );
    await repository.recordPoints(reward(ben, "pl-a", { amount: 10 }));

    expect(await repository.loadFacts(ana)).toEqual({
      totalPoints: 95,
      rewardCounts: { "exercise-completed": 2, "lesson-completed": 1, "achievement-unlocked": 1 },
    });
  });

  it("counts one exercise reward per distinct exercise, however often it was completed", async () => {
    for (let n = 0; n < 5; n += 1) {
      await repository.recordPoints(reward(ana, "pl-a"));
    }

    expect((await repository.loadFacts(ana)).rewardCounts["exercise-completed"]).toBe(1);
  });
});

describe("the points history", () => {
  async function seed(userId: string, sources: string[]) {
    for (const source of sources) {
      await repository.recordPoints(reward(userId, source));
    }
  }

  it("returns a student's transactions newest first", async () => {
    await seed(ana, ["pl-a", "pl-b", "pl-c"]);

    const page = await repository.listPointTransactions(ana, { limit: 10 });

    expect(page.transactions.map((t) => t.sourceId)).toEqual(["pl-c", "pl-b", "pl-a"]);
    expect(page.nextBefore).toBeNull();
  });

  it("pages with a cursor, with no overlap and no gap, and says when it is done", async () => {
    await seed(ana, ["pl-a", "pl-b", "pl-c", "pl-d", "pl-e"]);

    const first = await repository.listPointTransactions(ana, { limit: 2 });
    const second = await repository.listPointTransactions(ana, {
      limit: 2,
      ...(first.nextBefore === null ? {} : { before: first.nextBefore }),
    });
    const third = await repository.listPointTransactions(ana, {
      limit: 2,
      ...(second.nextBefore === null ? {} : { before: second.nextBefore }),
    });

    expect(first.transactions.map((t) => t.sourceId)).toEqual(["pl-e", "pl-d"]);
    expect(second.transactions.map((t) => t.sourceId)).toEqual(["pl-c", "pl-b"]);
    expect(third.transactions.map((t) => t.sourceId)).toEqual(["pl-a"]);
    expect(first.nextBefore).not.toBeNull();
    expect(third.nextBefore).toBeNull();
  });

  it("has no next page when the last one is exactly full", async () => {
    await seed(ana, ["pl-a", "pl-b"]);

    const page = await repository.listPointTransactions(ana, { limit: 2 });

    expect(page.transactions).toHaveLength(2);
    expect(page.nextBefore).toBeNull();
  });

  it("never returns another student's transactions, even with their cursor", async () => {
    await seed(ana, ["pl-a", "pl-b"]);
    await seed(ben, ["pl-x", "pl-y"]);
    const benPage = await repository.listPointTransactions(ben, { limit: 1 });

    const page = await repository.listPointTransactions(ana, {
      limit: 10,
      ...(benPage.nextBefore === null ? {} : { before: benPage.nextBefore }),
    });

    expect(page.transactions.every((t) => t.userId === ana)).toBe(true);
  });
});

describe("unlocked achievements", () => {
  it("records an unlock and lists it for that student only", async () => {
    const unlocked = await repository.recordUnlock({
      userId: ana,
      achievementKey: key("first-exercise"),
      unlockedAt: T0,
    });

    expect(unlocked).toEqual({ userId: ana, achievementKey: "first-exercise", unlockedAt: T0 });
    expect(await repository.listUnlockedAchievements(ana)).toEqual([unlocked]);
    expect(await repository.listUnlockedAchievements(ben)).toEqual([]);
  });

  it("unlocks an achievement once: a second unlock writes nothing", async () => {
    await repository.recordUnlock({
      userId: ana,
      achievementKey: key("first-exercise"),
      unlockedAt: T0,
    });

    const again = await repository.recordUnlock({
      userId: ana,
      achievementKey: key("first-exercise"),
      unlockedAt: new Date("2027-01-01T00:00:00.000Z"),
    });

    expect(again).toBeNull();
    const [only] = await repository.listUnlockedAchievements(ana);
    expect(only?.unlockedAt).toEqual(T0);
  });

  it("unlocks once when many callers race", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        repository.recordUnlock({
          userId: ana,
          achievementKey: key("first-lesson"),
          unlockedAt: T0,
        }),
      ),
    );

    expect(results.filter((r) => r !== null)).toHaveLength(1);
    expect(await count("user_achievements")).toBe(1);
  });

  it("refuses a malformed key, and an unlock for a student that does not exist", async () => {
    const malformed = await rejection(
      handle.rawExecute(
        sql`INSERT INTO user_achievements (user_id, achievement_key, unlocked_at) VALUES (${ana}, 'Not A Key', ${T0.toISOString()})`,
      ),
    );
    const orphan = await rejection(
      repository.recordUnlock({
        userId: "00000000-0000-4000-8000-000000000000",
        achievementKey: key("first-exercise"),
        unlockedAt: T0,
      }),
    );

    expect(malformed).toContain("user_achievements_key_valid");
    expect(orphan).toContain("user_achievements_user_id_users_id_fk");
  });
});

describe("transactionForUser", () => {
  it("commits everything the work wrote", async () => {
    await repository.transactionForUser(ana, async (store) => {
      await store.recordPoints(reward(ana, "pl-a"));
      await store.recordUnlock({
        userId: ana,
        achievementKey: key("first-exercise"),
        unlockedAt: T0,
      });
    });

    expect(await count("point_transactions")).toBe(1);
    expect(await count("user_achievements")).toBe(1);
  });

  it("rolls back every write when the work throws", async () => {
    await expect(
      repository.transactionForUser(ana, async (store) => {
        await store.recordPoints(reward(ana, "pl-a"));
        await store.recordUnlock({
          userId: ana,
          achievementKey: key("first-exercise"),
          unlockedAt: T0,
        });
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(await count("point_transactions")).toBe(0);
    expect(await count("user_achievements")).toBe(0);
  });

  it("rolls back when a later write in the same work violates a constraint", async () => {
    const message = await rejection(
      repository.transactionForUser(ana, async (store) => {
        await store.recordPoints(reward(ana, "pl-a"));
        await store.recordPoints(reward(ana, "pl-b", { amount: -1 }));
      }),
    );

    expect(message).toContain("point_transactions_amount_valid");
    expect(await count("point_transactions")).toBe(0);
  });

  it("lets the work read its own uncommitted writes", async () => {
    const facts = await repository.transactionForUser(ana, async (store) => {
      await store.recordPoints(reward(ana, "pl-a"));
      return store.loadFacts(ana);
    });

    expect(facts.totalPoints).toBe(10);
  });

  it("stays usable after a failed transaction", async () => {
    await expect(
      repository.transactionForUser(ana, () => Promise.reject(new Error("boom"))),
    ).rejects.toThrow();

    const stored = await repository.transactionForUser(ana, (store) =>
      store.recordPoints(reward(ana, "pl-a")),
    );

    expect(stored).not.toBeNull();
  });
});

describe("granting rewards through the real database", () => {
  const registry = createDefaultAchievementRegistry();
  const exercise = (n: number): RewardTrigger => ({
    kind: "exercise-completed",
    exerciseId: createExerciseId(`pl-first-ex${String(n)}`),
  });
  const lesson = (name: string): RewardTrigger => ({
    kind: "lesson-completed",
    lessonId: createContentId(name),
  });
  const award = () => new AwardRewardsUseCase(repository, registry, new FixedClock(T0));

  /**
   * The invariant the design exists to keep: every unlock has its payout and every payout has
   * its unlock, each exactly once.
   */
  async function assertLedgerAndUnlocksAgree(userId: string) {
    const unlocks = (await repository.listUnlockedAchievements(userId)).map(
      (u) => u.achievementKey,
    );
    const payouts = (
      (await handle.rawExecute(
        sql`SELECT source_id FROM point_transactions WHERE user_id = ${userId} AND reason = 'achievement-unlocked'`,
      )) as { rows: { source_id: string }[] }
    ).rows.map((r) => r.source_id);

    expect([...unlocks].sort()).toEqual([...payouts].sort());
    expect(new Set(unlocks).size).toBe(unlocks.length);
  }

  it("pays an exercise and its achievement, once, however many times it is repeated", async () => {
    for (let n = 0; n < 4; n += 1) {
      await award().execute({ userId: ana, trigger: exercise(1) });
    }

    expect((await repository.loadFacts(ana)).totalPoints).toBe(60);
    await assertLedgerAndUnlocksAgree(ana);
  });

  it("pays once when the same completion arrives many times at once", async () => {
    const outcomes = await Promise.all(
      Array.from({ length: 10 }, () => award().execute({ userId: ana, trigger: exercise(1) })),
    );

    expect((await repository.loadFacts(ana)).totalPoints).toBe(60);
    expect(outcomes.filter((o) => o.pointsAwarded > 0)).toHaveLength(1);
    await assertLedgerAndUnlocksAgree(ana);
  });

  it("pays a lesson once under concurrent completion", async () => {
    await Promise.all(
      Array.from({ length: 10 }, () => award().execute({ userId: ana, trigger: lesson("pl-a") })),
    );

    expect((await repository.loadFacts(ana)).totalPoints).toBe(75);
    await assertLedgerAndUnlocksAgree(ana);
  });

  it("keeps two students' concurrent rewards independent", async () => {
    await Promise.all([
      award().execute({ userId: ana, trigger: exercise(1) }),
      award().execute({ userId: ben, trigger: exercise(1) }),
    ]);

    expect((await repository.loadFacts(ana)).totalPoints).toBe(60);
    expect((await repository.loadFacts(ben)).totalPoints).toBe(60);
  });

  it("does not lose hundred-points when two exercises finish together across the threshold", async () => {
    await repository.recordPoints(
      reward(ana, "pl-seeded", { reason: "lesson-completed", amount: 35 }),
    );
    await repository.recordPoints(
      reward(ana, "first-exercise", { reason: "achievement-unlocked", amount: 50 }),
    );
    await repository.recordUnlock({
      userId: ana,
      achievementKey: key("first-exercise"),
      unlockedAt: T0,
    });

    await Promise.all([
      award().execute({ userId: ana, trigger: exercise(1) }),
      award().execute({ userId: ana, trigger: exercise(2) }),
    ]);

    expect((await repository.listUnlockedAchievements(ana)).map((u) => u.achievementKey)).toContain(
      "hundred-points",
    );
    await assertLedgerAndUnlocksAgree(ana);
  });

  it("stores nothing at all when the achievement's payout fails midway, and grants it once the cause is gone", async () => {
    // From now on the database refuses any achievement payout, so the reward for the exercise
    // and the unlock are written before the payout fails — and must not survive it.
    await handle.rawExecute(
      sql`ALTER TABLE point_transactions ADD CONSTRAINT test_no_payouts CHECK (reason <> 'achievement-unlocked')`,
    );
    await expect(award().execute({ userId: ana, trigger: exercise(1) })).rejects.toThrow();
    await handle.rawExecute(sql`ALTER TABLE point_transactions DROP CONSTRAINT test_no_payouts`);

    expect(await count("point_transactions")).toBe(0);
    expect(await count("user_achievements")).toBe(0);

    const retry = await award().execute({ userId: ana, trigger: exercise(1) });

    expect(retry.pointsAwarded).toBe(60);
    await assertLedgerAndUnlocksAgree(ana);
  });
});
