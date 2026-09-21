import path from "node:path";
import { fileURLToPath } from "node:url";

import { AwardRewardsUseCase, type RewardTrigger } from "@tfm-bic/application";
import { FixedClock } from "@tfm-bic/application/testing";
import {
  createAchievementKey,
  createDefaultAchievementRegistry,
  createExerciseId,
} from "@tfm-bic/domain";
import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as identitySchema from "../identity/db/schema.js";
import * as gamificationSchema from "./db/schema.js";
import { DrizzleGamificationRepository } from "./gamification.repository.js";

/**
 * The genuinely multi-connection check. The default suite runs on PGlite, which serialises every
 * query on one connection, so it cannot show the per-student advisory lock actually making
 * concurrent requests wait. This file does, against a real PostgreSQL server, and is skipped
 * unless TEST_DATABASE_URL is set (a connection string to a server where a scratch database may
 * be created and dropped — the local dev container from infrastructure/docker is enough):
 *
 *   TEST_DATABASE_URL=postgres://tfm_bic:tfm_bic_dev_only@localhost:5432/postgres \
 *     pnpm --filter @tfm-bic/data exec vitest run src/gamification/gamification.repository.postgres
 *
 * It creates a throwaway database, applies every context's migrations in order, and drops it.
 */
const adminUrl = process.env.TEST_DATABASE_URL;

const dataSrc = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrations = (context: string) => path.join(dataSrc, context, "db", "migrations");
const scratchName = `tfm_bic_m8_${String(Date.now())}_${Math.random().toString(36).slice(2, 8)}`;

describe.skipIf(!adminUrl)("gamification against a real PostgreSQL (multi-connection)", () => {
  let admin: Pool;
  let pool: Pool;
  let db: NodePgDatabase<typeof gamificationSchema & typeof identitySchema>;
  let repository: DrizzleGamificationRepository;
  const T0 = new Date("2026-01-01T10:00:00.000Z");
  const registry = createDefaultAchievementRegistry();

  beforeAll(async () => {
    admin = new Pool({ connectionString: adminUrl, max: 1 });
    await admin.query(`CREATE DATABASE ${scratchName}`);
    const url = new URL(adminUrl!);
    url.pathname = `/${scratchName}`;
    pool = new Pool({ connectionString: url.toString(), max: 12 });
    db = drizzle(pool, { schema: { ...identitySchema, ...gamificationSchema } });
    await migrate(db, { migrationsFolder: migrations("identity") });
    await migrate(db, {
      migrationsFolder: migrations("gamification"),
      migrationsTable: "__drizzle_migrations_gamification",
    });
    repository = new DrizzleGamificationRepository(db);
  }, 60_000);

  afterAll(async () => {
    await pool.end();
    await admin.query(`DROP DATABASE IF EXISTS ${scratchName} WITH (FORCE)`);
    await admin.end();
  });

  async function seedUser(label: string): Promise<string> {
    const address = `${label}-${Math.random().toString(36).slice(2)}@example.com`;
    const [row] = await db
      .insert(identitySchema.users)
      .values({ email: address, normalizedEmail: address, passwordHash: "test-only" })
      .returning({ id: identitySchema.users.id });
    if (!row) {
      throw new Error("seeding a user returned no row");
    }
    return row.id;
  }

  const exercise = (n: number): RewardTrigger => ({
    kind: "exercise-completed",
    exerciseId: createExerciseId(`pl-first-ex${String(n)}`),
  });
  const award = () => new AwardRewardsUseCase(repository, registry, new FixedClock(T0));

  async function total(userId: string): Promise<number> {
    return (await repository.loadFacts(userId)).totalPoints;
  }

  it("pays one reward once when many requests on different connections race for it", async () => {
    const userId = await seedUser("same-reward");

    const outcomes = await Promise.all(
      Array.from({ length: 12 }, () => award().execute({ userId, trigger: exercise(1) })),
    );

    expect(outcomes.filter((o) => o.pointsAwarded > 0)).toHaveLength(1);
    expect(await total(userId)).toBe(60);
    const unlocks = await repository.listUnlockedAchievements(userId);
    expect(unlocks.map((u) => u.achievementKey)).toEqual(["first-exercise"]);
  });

  it("does not lose the hundred-points achievement when two rewards cross the threshold together, round after round", async () => {
    for (let round = 0; round < 15; round += 1) {
      const userId = await seedUser("threshold");
      // 85 points with first-exercise already unlocked: each request alone sees 95.
      await repository.recordPoints({
        userId,
        amount: 35,
        reason: "lesson-completed",
        sourceId: "pl-seeded",
        createdAt: T0,
      });
      await repository.recordPoints({
        userId,
        amount: 50,
        reason: "achievement-unlocked",
        sourceId: "first-exercise",
        createdAt: T0,
      });
      await repository.recordUnlock({
        userId,
        achievementKey: createAchievementKey("first-exercise"),
        unlockedAt: T0,
      });

      await Promise.all([
        award().execute({ userId, trigger: exercise(1) }),
        award().execute({ userId, trigger: exercise(2) }),
      ]);

      const keys = (await repository.listUnlockedAchievements(userId)).map((u) => u.achievementKey);
      expect(keys.filter((k) => k === "hundred-points")).toHaveLength(1);
      expect(await total(userId)).toBe(85 + 10 + 10 + 50);
    }
  }, 60_000);

  it("makes a second request for the same student wait for the first, but not another student's", async () => {
    const ana = await seedUser("lock-ana");
    const ben = await seedUser("lock-ben");
    const order: string[] = [];
    const hold = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    const first = repository.transactionForUser(ana, async () => {
      order.push("ana-1 start");
      await hold(400);
      order.push("ana-1 end");
    });
    await hold(50);
    const second = repository.transactionForUser(ana, () => {
      order.push("ana-2 start");
      return Promise.resolve();
    });
    const other = repository.transactionForUser(ben, () => {
      order.push("ben start");
      return Promise.resolve();
    });
    await Promise.all([first, second, other]);

    expect(order.indexOf("ana-2 start")).toBeGreaterThan(order.indexOf("ana-1 end"));
    expect(order.indexOf("ben start")).toBeLessThan(order.indexOf("ana-1 end"));
  });

  it("releases the lock when the work fails, so the student is not stuck", async () => {
    const userId = await seedUser("lock-release");

    await expect(
      repository.transactionForUser(userId, () => Promise.reject(new Error("boom"))),
    ).rejects.toThrow("boom");

    await expect(
      repository.transactionForUser(userId, () => Promise.resolve("free")),
    ).resolves.toBe("free");
  });

  it("keeps the ledger and the unlocks in agreement after all of that", async () => {
    const result = await db.execute(sql`
      SELECT count(*)::int AS n FROM user_achievements u
      WHERE NOT EXISTS (
        SELECT 1 FROM point_transactions t
        WHERE t.user_id = u.user_id AND t.reason = 'achievement-unlocked' AND t.source_id = u.achievement_key
      )`);
    expect((result as unknown as { rows: { n: number }[] }).rows[0]?.n).toBe(0);
  });
});
