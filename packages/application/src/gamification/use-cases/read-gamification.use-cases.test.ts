import {
  AchievementRegistry,
  completionCountRule,
  createAchievementKey,
  createContentId,
  createDefaultAchievementRegistry,
  createExerciseId,
} from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import {
  AchievementTexts,
  DEFAULT_ACHIEVEMENT_TEXT_CATALOG,
  DEFAULT_INTERFACE_LOCALE,
  type AchievementTextCatalog,
} from "../achievement-texts.js";
import { FixedClock } from "../../identity/test-support/fakes.js";
import { FakeGamificationRepository } from "../test-support/fakes.js";
import { AwardRewardsUseCase, type RewardTrigger } from "./award-rewards.use-case.js";
import { GetGamificationSummaryUseCase } from "./get-gamification-summary.use-case.js";
import { ListAchievementsUseCase } from "./list-achievements.use-case.js";
import { ListPointTransactionsUseCase } from "./list-point-transactions.use-case.js";

const ANA = "user-ana";
const BEN = "user-ben";
const T0 = new Date("2026-01-01T10:00:00.000Z");

const exercise = (n: number): RewardTrigger => ({
  kind: "exercise-completed",
  exerciseId: createExerciseId(`pl-first-ex${String(n)}`),
});
const lesson = (name: string): RewardTrigger => ({
  kind: "lesson-completed",
  lessonId: createContentId(name),
});

function setup(
  registry = createDefaultAchievementRegistry(),
  catalog: AchievementTextCatalog = DEFAULT_ACHIEVEMENT_TEXT_CATALOG,
) {
  const repository = new FakeGamificationRepository();
  const clock = new FixedClock(T0);
  const texts = new AchievementTexts(registry, catalog, DEFAULT_INTERFACE_LOCALE);
  return {
    repository,
    clock,
    award: new AwardRewardsUseCase(repository, registry, clock),
    summary: new GetGamificationSummaryUseCase(repository, registry, texts),
    achievements: new ListAchievementsUseCase(repository, registry, texts),
    history: new ListPointTransactionsUseCase(repository, registry, texts),
  };
}

describe("GetGamificationSummaryUseCase", () => {
  it("is empty and honest for a student who has done nothing", async () => {
    const { summary } = setup();

    const result = await summary.execute({ userId: ANA, locale: "en" });

    expect(result).toEqual({
      totalPoints: 0,
      achievements: { unlockedCount: 0, totalCount: 4 },
      inProgressAchievements: [],
      recentTransactions: [],
    });
  });

  it("reports the ledger's total, the unlocked count and the recent rewards, newest first", async () => {
    const { award, summary } = setup();
    await award.execute({ userId: ANA, trigger: exercise(1) });
    await award.execute({ userId: ANA, trigger: lesson("pl-greetings") });

    const result = await summary.execute({ userId: ANA, locale: "en" });

    // 10 + 50 (first-exercise), 25 + 50 (first-lesson), then 135 crosses 100: + 50 (hundred-points).
    expect(result.totalPoints).toBe(185);
    expect(result.achievements).toEqual({ unlockedCount: 3, totalCount: 4 });
    expect(result.recentTransactions.map((t) => `${t.reason}:${String(t.amount)}`)).toEqual([
      "achievement-unlocked:50",
      "achievement-unlocked:50",
      "lesson-completed:25",
      "achievement-unlocked:50",
      "exercise-completed:10",
    ]);
  });

  it("names an unlock by its localised title and leaves other rows without one", async () => {
    const { award, summary } = setup();
    await award.execute({ userId: ANA, trigger: exercise(1) });

    const { recentTransactions } = await summary.execute({ userId: ANA, locale: "en" });

    const byReason = Object.fromEntries(recentTransactions.map((t) => [t.reason, t.title]));
    expect(byReason["achievement-unlocked"]).toBe("First exercise");
    expect(byReason["exercise-completed"]).toBeNull();
  });

  it("shows only the five most recent rewards", async () => {
    const { award, summary } = setup();
    for (let n = 1; n <= 8; n += 1) {
      await award.execute({ userId: ANA, trigger: exercise(n) });
    }

    const { recentTransactions } = await summary.execute({ userId: ANA, locale: "en" });

    expect(recentTransactions).toHaveLength(5);
  });

  it("puts the achievements that are closest, but not yet unlocked, in progress", async () => {
    const { award, summary } = setup();
    for (let n = 1; n <= 3; n += 1) {
      await award.execute({ userId: ANA, trigger: exercise(n) });
    }

    const { inProgressAchievements } = await summary.execute({ userId: ANA, locale: "en" });

    // 80 points and 3 exercises: hundred-points is 80/100, ten exercises 3/10, first-lesson 0/1
    // (nothing done, so not "in progress").
    expect(inProgressAchievements.map((a) => a.key)).toEqual([
      "hundred-points",
      "ten-correct-exercises",
    ]);
    expect(inProgressAchievements[1]?.progress).toEqual({ current: 3, target: 10 });
  });

  it("orders what is in progress by how far along it is, and keeps three at most", async () => {
    const many = new AchievementRegistry([
      completionCountRule({
        key: createAchievementKey("ex-2"),
        iconId: "spark",
        reason: "exercise-completed",
        trigger: "exercise-completed",
        target: 20,
      }),
      completionCountRule({
        key: createAchievementKey("ex-3"),
        iconId: "spark",
        reason: "exercise-completed",
        trigger: "exercise-completed",
        target: 4,
      }),
      completionCountRule({
        key: createAchievementKey("ex-4"),
        iconId: "spark",
        reason: "exercise-completed",
        trigger: "exercise-completed",
        target: 10,
      }),
      completionCountRule({
        key: createAchievementKey("ex-5"),
        iconId: "spark",
        reason: "exercise-completed",
        trigger: "exercise-completed",
        target: 100,
      }),
    ]);
    const texts = Object.fromEntries(
      many
        .all()
        .map((r) => [r.achievement.key, { title: `T ${r.achievement.key}`, description: "d" }]),
    );
    const { award, summary } = setup(many, { en: texts });
    await award.execute({ userId: ANA, trigger: exercise(1) });
    await award.execute({ userId: ANA, trigger: exercise(2) });

    const { inProgressAchievements } = await summary.execute({ userId: ANA, locale: "en" });

    expect(inProgressAchievements.map((a) => a.key)).toEqual(["ex-3", "ex-4", "ex-2"]);
  });

  it("only ever describes the requesting student", async () => {
    const { award, summary } = setup();
    await award.execute({ userId: ANA, trigger: exercise(1) });

    const ben = await summary.execute({ userId: BEN, locale: "en" });

    expect(ben.totalPoints).toBe(0);
    expect(ben.recentTransactions).toEqual([]);
  });

  it("reads without writing, and costs the same number of reads however many achievements exist", async () => {
    const small = setup();
    const readsFor = async (ctx: ReturnType<typeof setup>) => {
      const before = ctx.repository.readCalls;
      await ctx.summary.execute({ userId: ANA, locale: "en" });
      return { reads: ctx.repository.readCalls - before, writes: ctx.repository.writeCalls };
    };

    const keys = Array.from({ length: 40 }, (_, n) => `bulk-${String(n)}`);
    const big = new AchievementRegistry(
      keys.map((key) =>
        completionCountRule({
          key: createAchievementKey(key),
          iconId: "spark",
          reason: "exercise-completed",
          trigger: "exercise-completed",
          target: 500,
        }),
      ),
    );
    const bigCtx = setup(big, {
      en: Object.fromEntries(keys.map((key) => [key, { title: key, description: key }])),
    });

    const a = await readsFor(small);
    const b = await readsFor(bigCtx);

    expect(a).toEqual({ reads: 3, writes: 0 });
    expect(b).toEqual({ reads: 3, writes: 0 });
  });

  it("speaks the requested language when texts exist for it", async () => {
    const xx: AchievementTextCatalog = {
      ...DEFAULT_ACHIEVEMENT_TEXT_CATALOG,
      xx: Object.fromEntries(
        createDefaultAchievementRegistry()
          .all()
          .map((r) => [r.achievement.key, { title: `Xx ${r.achievement.key}`, description: "xx" }]),
      ),
    };
    const { award, summary } = setup(createDefaultAchievementRegistry(), xx);
    await award.execute({ userId: ANA, trigger: exercise(1) });

    const { recentTransactions } = await summary.execute({ userId: ANA, locale: "xx" });

    expect(recentTransactions.find((t) => t.title !== null)?.title).toBe("Xx first-exercise");
  });
});

describe("ListAchievementsUseCase", () => {
  it("lists every achievement in catalog order, locked with progress or unlocked with a date", async () => {
    const { award, achievements } = setup();
    await award.execute({ userId: ANA, trigger: exercise(1) });

    const result = await achievements.execute({ userId: ANA, locale: "en" });

    expect(result.totalCount).toBe(4);
    expect(result.unlockedCount).toBe(1);
    expect(result.achievements.map((a) => [a.key, a.unlocked])).toEqual([
      ["first-exercise", true],
      ["first-lesson", false],
      ["ten-correct-exercises", false],
      ["hundred-points", false],
    ]);
    const first = result.achievements[0];
    expect(first).toMatchObject({
      title: "First exercise",
      iconId: "spark",
      rewardPoints: 50,
      unlockedAt: T0,
      progress: { current: 1, target: 1 },
    });
    expect(result.achievements[2]?.progress).toEqual({ current: 1, target: 10 });
    expect(result.achievements[3]?.progress).toEqual({ current: 60, target: 100 });
    expect(result.achievements[1]?.unlockedAt).toBeNull();
  });

  it("never reports progress beyond the target", async () => {
    const { award, achievements } = setup();
    for (let n = 1; n <= 12; n += 1) {
      await award.execute({ userId: ANA, trigger: exercise(n) });
    }

    const result = await achievements.execute({ userId: ANA, locale: "en" });

    const ten = result.achievements.find((a) => a.key === "ten-correct-exercises");
    expect(ten?.progress).toEqual({ current: 10, target: 10 });
    const hundred = result.achievements.find((a) => a.key === "hundred-points");
    expect(hundred?.progress).toEqual({ current: 100, target: 100 });
  });

  it("ignores an unlock whose achievement no longer exists in the catalog", async () => {
    const { repository, achievements } = setup();
    await repository.recordUnlock({
      userId: ANA,
      achievementKey: createAchievementKey("retired-achievement"),
      unlockedAt: T0,
    });

    const result = await achievements.execute({ userId: ANA, locale: "en" });

    expect(result.unlockedCount).toBe(0);
    expect(result.achievements.every((a) => !a.unlocked)).toBe(true);
  });

  it("only shows the requesting student's unlocks", async () => {
    const { award, achievements } = setup();
    await award.execute({ userId: ANA, trigger: exercise(1) });

    const ben = await achievements.execute({ userId: BEN, locale: "en" });

    expect(ben.unlockedCount).toBe(0);
  });

  it("reads without writing", async () => {
    const { repository, achievements } = setup();

    await achievements.execute({ userId: ANA, locale: "en" });

    expect(repository.writeCalls).toBe(0);
    expect(repository.readCalls).toBe(2);
  });
});

describe("ListPointTransactionsUseCase", () => {
  it("explains how the points were obtained: reason and source, newest first", async () => {
    const { award, history } = setup();
    await award.execute({ userId: ANA, trigger: exercise(1) });

    const page = await history.execute({ userId: ANA, locale: "en", limit: 20 });

    expect(page.transactions.map((t) => [t.reason, t.sourceId, t.amount])).toEqual([
      ["achievement-unlocked", "first-exercise", 50],
      ["exercise-completed", "pl-first-ex1", 10],
    ]);
    expect(page.nextBefore).toBeNull();
  });

  it("pages through the history with a cursor and stops at the end", async () => {
    const { award, history } = setup();
    for (let n = 1; n <= 5; n += 1) {
      await award.execute({ userId: ANA, trigger: exercise(n) });
    }
    // 5 exercises + first-exercise + hundred-points = 7 rows.
    const seen: number[] = [];

    let before: number | undefined;
    for (let guard = 0; guard < 10; guard += 1) {
      const page = await history.execute({
        userId: ANA,
        locale: "en",
        limit: 3,
        ...(before === undefined ? {} : { before }),
      });
      seen.push(...page.transactions.map((t) => t.id));
      if (page.nextBefore === null) {
        break;
      }
      before = page.nextBefore;
    }

    expect(seen).toHaveLength(7);
    expect(new Set(seen).size).toBe(7);
    expect([...seen].sort((x, y) => y - x)).toEqual(seen);
  });

  it("only ever returns the requesting student's own transactions", async () => {
    const { award, history } = setup();
    await award.execute({ userId: ANA, trigger: exercise(1) });

    const ben = await history.execute({ userId: BEN, locale: "en", limit: 20 });

    expect(ben.transactions).toEqual([]);
  });

  it("gives an unlock its localised title", async () => {
    const { award, history } = setup();
    await award.execute({ userId: ANA, trigger: exercise(1) });

    const page = await history.execute({ userId: ANA, locale: "en", limit: 20 });

    expect(page.transactions[0]?.title).toBe("First exercise");
  });
});
