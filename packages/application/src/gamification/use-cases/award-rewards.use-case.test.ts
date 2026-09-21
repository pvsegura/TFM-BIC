import {
  AchievementRegistry,
  completionCountRule,
  createAchievementKey,
  createContentId,
  createDefaultAchievementRegistry,
  createExerciseId,
  InvalidRewardSourceError,
  totalPointsRule,
  type ExerciseId,
} from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FixedClock } from "../../identity/test-support/fakes.js";
import { FakeGamificationRepository } from "../test-support/fakes.js";
import { RewardAwardError } from "../reward-award.error.js";
import { AwardRewardsUseCase, type RewardTrigger } from "./award-rewards.use-case.js";

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

function setup(registry: AchievementRegistry = createDefaultAchievementRegistry()) {
  const repository = new FakeGamificationRepository();
  const clock = new FixedClock(T0);
  const useCase = new AwardRewardsUseCase(repository, registry, clock);
  return { repository, clock, useCase, registry };
}

const ledger = (repository: FakeGamificationRepository, userId = ANA) =>
  repository.transactions
    .filter((t) => t.userId === userId)
    .map((t) => `${t.reason}:${t.sourceId}:${String(t.amount)}`);

const total = (repository: FakeGamificationRepository, userId = ANA) =>
  repository.transactions.filter((t) => t.userId === userId).reduce((sum, t) => sum + t.amount, 0);

describe("rewarding a correctly completed exercise", () => {
  it("gives +10 the first time, plus the first-exercise achievement and its +50", async () => {
    const { repository, useCase } = setup();

    const outcome = await useCase.execute({ userId: ANA, trigger: exercise(1) });

    expect(outcome.pointsAwarded).toBe(60);
    expect(outcome.unlocked.map((a) => a.key)).toEqual(["first-exercise"]);
    expect(ledger(repository)).toEqual([
      "exercise-completed:pl-first-ex1:10",
      "achievement-unlocked:first-exercise:50",
    ]);
    expect(repository.unlocks.map((u) => u.achievementKey)).toEqual(["first-exercise"]);
  });

  it("gives +0 when the same exercise is completed again", async () => {
    const { repository, useCase } = setup();
    await useCase.execute({ userId: ANA, trigger: exercise(1) });

    const again = await useCase.execute({ userId: ANA, trigger: exercise(1) });

    expect(again.pointsAwarded).toBe(0);
    expect(again.unlocked).toEqual([]);
    expect(again.transactions).toEqual([]);
    expect(total(repository)).toBe(60);
    expect(repository.transactions).toHaveLength(2);
  });

  it("gives +10 for each further distinct exercise and no second first-exercise", async () => {
    const { repository, useCase } = setup();
    await useCase.execute({ userId: ANA, trigger: exercise(1) });

    const second = await useCase.execute({ userId: ANA, trigger: exercise(2) });

    expect(second.pointsAwarded).toBe(10);
    expect(second.unlocked).toEqual([]);
    expect(total(repository)).toBe(70);
  });

  it("stamps every transaction with the clock's time, not the caller's", async () => {
    const { repository, useCase } = setup();

    await useCase.execute({ userId: ANA, trigger: exercise(1) });

    expect(repository.transactions.map((t) => t.createdAt)).toEqual([T0, T0]);
    expect(repository.unlocks[0]?.unlockedAt).toEqual(T0);
  });

  it("rewards each student separately for the same exercise", async () => {
    const { repository, useCase } = setup();

    await useCase.execute({ userId: ANA, trigger: exercise(1) });
    const ben = await useCase.execute({ userId: BEN, trigger: exercise(1) });

    expect(ben.pointsAwarded).toBe(60);
    expect(total(repository, ANA)).toBe(60);
    expect(total(repository, BEN)).toBe(60);
  });

  it("does not re-evaluate anything for a reward that was already given", async () => {
    const { repository, useCase } = setup();
    await useCase.execute({ userId: ANA, trigger: exercise(1) });
    const readsBefore = repository.readCalls;

    await useCase.execute({ userId: ANA, trigger: exercise(1) });

    expect(repository.readCalls).toBe(readsBefore);
  });
});

describe("rewarding a completed lesson", () => {
  it("gives +25 the first time, plus the first-lesson achievement", async () => {
    const { repository, useCase } = setup();

    const outcome = await useCase.execute({ userId: ANA, trigger: lesson("pl-greetings") });

    expect(outcome.pointsAwarded).toBe(75);
    expect(outcome.unlocked.map((a) => a.key)).toEqual(["first-lesson"]);
    expect(ledger(repository)).toEqual([
      "lesson-completed:pl-greetings:25",
      "achievement-unlocked:first-lesson:50",
    ]);
  });

  it("gives +0 when the same lesson is completed again", async () => {
    const { repository, useCase } = setup();
    await useCase.execute({ userId: ANA, trigger: lesson("pl-greetings") });

    const again = await useCase.execute({ userId: ANA, trigger: lesson("pl-greetings") });

    expect(again.pointsAwarded).toBe(0);
    expect(total(repository)).toBe(75);
  });

  it("gives +25 for another lesson but no second first-lesson", async () => {
    const { useCase } = setup();
    await useCase.execute({ userId: ANA, trigger: lesson("pl-greetings") });

    const other = await useCase.execute({ userId: ANA, trigger: lesson("pl-numbers") });

    expect(other.transactions[0]).toMatchObject({ reason: "lesson-completed", amount: 25 });
    // 75 + 25 = 100 points: that is hundred-points, and only that.
    expect(other.unlocked.map((a) => a.key)).toEqual(["hundred-points"]);
  });
});

describe("achievements that depend on the running totals", () => {
  it("unlocks ten-correct-exercises on the tenth distinct exercise, not the ninth", async () => {
    const { useCase } = setup();
    for (let n = 1; n <= 9; n += 1) {
      const outcome = await useCase.execute({ userId: ANA, trigger: exercise(n) });
      expect(outcome.unlocked.map((a) => a.key)).not.toContain("ten-correct-exercises");
    }

    const tenth = await useCase.execute({ userId: ANA, trigger: exercise(10) });

    expect(tenth.unlocked.map((a) => a.key)).toContain("ten-correct-exercises");
  });

  it("does not count repeated attempts at one exercise as ten exercises", async () => {
    const { repository, useCase } = setup();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await useCase.execute({ userId: ANA, trigger: exercise(1) });
    }

    expect(repository.unlocks.map((u) => u.achievementKey)).toEqual(["first-exercise"]);
    expect(total(repository)).toBe(60);
  });

  it("unlocks hundred-points as soon as the total reaches 100, as a consequence of points awarded", async () => {
    const { repository, useCase } = setup();
    // 60 after the first exercise, 70 after the second ... 100 after the fifth.
    for (let n = 1; n <= 4; n += 1) {
      await useCase.execute({ userId: ANA, trigger: exercise(n) });
    }
    expect(repository.unlocks.map((u) => u.achievementKey)).not.toContain("hundred-points");

    const fifth = await useCase.execute({ userId: ANA, trigger: exercise(5) });

    expect(fifth.unlocked.map((a) => a.key)).toEqual(["hundred-points"]);
    expect(fifth.pointsAwarded).toBe(60);
    expect(total(repository)).toBe(150);
  });

  it("follows the chain: a reward can unlock an achievement whose reward unlocks another", async () => {
    const { repository, useCase } = setup();
    await useCase.execute({ userId: ANA, trigger: exercise(1) }); // 60

    // A lesson: +25 = 85, first-lesson +50 = 135 (crosses 100) -> hundred-points +50 = 185.
    const outcome = await useCase.execute({ userId: ANA, trigger: lesson("pl-greetings") });

    expect(outcome.unlocked.map((a) => a.key)).toEqual(["first-lesson", "hundred-points"]);
    expect(outcome.pointsAwarded).toBe(125);
    expect(total(repository)).toBe(185);
  });

  it("never unlocks or pays an achievement twice, even when a later reward meets its criterion again", async () => {
    const { repository, useCase } = setup();
    for (let n = 1; n <= 12; n += 1) {
      await useCase.execute({ userId: ANA, trigger: exercise(n) });
    }
    await useCase.execute({ userId: ANA, trigger: lesson("pl-greetings") });

    const keys = repository.unlocks.map((u) => u.achievementKey);
    expect(new Set(keys).size).toBe(keys.length);
    const unlockPayouts = repository.transactions.filter(
      (t) => t.reason === "achievement-unlocked",
    );
    expect(unlockPayouts).toHaveLength(keys.length);
    expect(unlockPayouts.every((t) => t.amount === 50)).toBe(true);
  });
});

describe("a new achievement is just a new rule", () => {
  it("evaluates and rewards a rule added to the registry, using its own reward", async () => {
    const registry = new AchievementRegistry([
      ...createDefaultAchievementRegistry().all(),
      completionCountRule({
        key: createAchievementKey("three-exercises"),
        iconId: "target",
        reason: "exercise-completed",
        trigger: "exercise-completed",
        target: 3,
        rewardPoints: 75,
      }),
      totalPointsRule({ key: createAchievementKey("twenty-points"), iconId: "star", target: 20 }),
    ]);
    const { repository, useCase } = setup(registry);
    await useCase.execute({ userId: ANA, trigger: exercise(1) });
    await useCase.execute({ userId: ANA, trigger: exercise(2) });

    const third = await useCase.execute({ userId: ANA, trigger: exercise(3) });

    expect(third.unlocked.map((a) => a.key)).toEqual(["three-exercises"]);
    expect(ledger(repository)).toContain("achievement-unlocked:three-exercises:75");
    expect(repository.unlocks.map((u) => u.achievementKey)).toContain("twenty-points");
  });
});

describe("concurrent and repeated requests", () => {
  it("pays an exercise once when the same completion arrives many times at once", async () => {
    const { repository, useCase } = setup();

    const outcomes = await Promise.all(
      Array.from({ length: 8 }, () => useCase.execute({ userId: ANA, trigger: exercise(1) })),
    );

    expect(total(repository)).toBe(60);
    expect(repository.transactions).toHaveLength(2);
    expect(outcomes.filter((o) => o.pointsAwarded > 0)).toHaveLength(1);
    expect(repository.unlocks).toHaveLength(1);
  });

  it("pays a lesson once when the same completion arrives many times at once", async () => {
    const { repository, useCase } = setup();

    await Promise.all(
      Array.from({ length: 8 }, () => useCase.execute({ userId: ANA, trigger: lesson("pl-a") })),
    );

    expect(total(repository)).toBe(75);
  });

  it("does not lose an achievement when two different rewards race across a threshold", async () => {
    const { repository, useCase } = setup();
    // 85 points, first-exercise already unlocked: two exercises finishing together each look, in
    // isolation, like 95 — only one after the other (105) crosses 100.
    await repository.recordPoints({
      userId: ANA,
      amount: 35,
      reason: "lesson-completed",
      sourceId: "pl-seeded",
      createdAt: T0,
    });
    await repository.recordPoints({
      userId: ANA,
      amount: 50,
      reason: "achievement-unlocked",
      sourceId: "first-exercise",
      createdAt: T0,
    });
    await repository.recordUnlock({
      userId: ANA,
      achievementKey: createAchievementKey("first-exercise"),
      unlockedAt: T0,
    });

    await Promise.all([
      useCase.execute({ userId: ANA, trigger: exercise(1) }),
      useCase.execute({ userId: ANA, trigger: exercise(2) }),
    ]);

    const keys = repository.unlocks.map((u) => u.achievementKey);
    expect(keys.filter((k) => k === "hundred-points")).toHaveLength(1);
    expect(total(repository)).toBe(85 + 10 + 10 + 50);
  });

  it("does not let one student's request wait on, or change, another's", async () => {
    const { repository, useCase } = setup();

    await Promise.all([
      useCase.execute({ userId: ANA, trigger: exercise(1) }),
      useCase.execute({ userId: BEN, trigger: exercise(1) }),
    ]);

    expect(total(repository, ANA)).toBe(60);
    expect(total(repository, BEN)).toBe(60);
  });
});

describe("consistency when something fails", () => {
  it("stores the reward, the unlock and the unlock's reward together or not at all", async () => {
    const { repository, useCase } = setup();
    // The reward for the achievement fails: nothing the same request wrote may survive.
    repository.failWhen = (write) =>
      write.kind === "points" && write.reason === "achievement-unlocked";

    await expect(useCase.execute({ userId: ANA, trigger: exercise(1) })).rejects.toBeInstanceOf(
      RewardAwardError,
    );

    expect(repository.transactions).toEqual([]);
    expect(repository.unlocks).toEqual([]);
  });

  it("never leaves an unlock without its reward when the unlock itself fails midway", async () => {
    const { repository, useCase } = setup();
    repository.failWhen = (write) => write.kind === "unlock";

    await expect(useCase.execute({ userId: ANA, trigger: exercise(1) })).rejects.toBeInstanceOf(
      RewardAwardError,
    );

    expect(repository.transactions).toEqual([]);
    expect(repository.unlocks).toEqual([]);
  });

  it("recovers on the next attempt: the reward that failed is granted, once", async () => {
    const { repository, useCase } = setup();
    repository.failWhen = () => true;
    await expect(useCase.execute({ userId: ANA, trigger: exercise(1) })).rejects.toBeInstanceOf(
      RewardAwardError,
    );
    repository.failWhen = undefined;

    const retry = await useCase.execute({ userId: ANA, trigger: exercise(1) });

    expect(retry.pointsAwarded).toBe(60);
    expect(total(repository)).toBe(60);
  });

  it("keeps serving other requests after one failed", async () => {
    const { repository, useCase } = setup();
    repository.failWhen = (write) => write.sourceId === "pl-first-ex1";
    const failed = useCase.execute({ userId: ANA, trigger: exercise(1) });
    const fine = useCase.execute({ userId: ANA, trigger: exercise(2) });

    await expect(failed).rejects.toBeInstanceOf(RewardAwardError);
    await expect(fine).resolves.toMatchObject({ pointsAwarded: 60 });
  });

  it("names what failed and why, without the student's identity", async () => {
    const { repository, useCase } = setup();
    repository.failWhen = () => true;

    const error = await useCase
      .execute({ userId: ANA, trigger: exercise(1) })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RewardAwardError);
    const failure = error as RewardAwardError;
    expect(failure.reason).toBe("exercise-completed");
    expect(failure.sourceId).toBe("pl-first-ex1");
    expect(failure.cause).toBeInstanceOf(Error);
    expect(failure.message).not.toContain(ANA);
  });

  it("refuses a malformed source without writing anything", async () => {
    const { repository, useCase } = setup();
    const bad: RewardTrigger = {
      kind: "exercise-completed",
      exerciseId: "Bad Id" as unknown as ExerciseId,
    };

    const error = await useCase.execute({ userId: ANA, trigger: bad }).catch((e: unknown) => e);

    expect((error as RewardAwardError).cause).toBeInstanceOf(InvalidRewardSourceError);
    expect(repository.writeCalls).toBe(0);
  });

  it("converges when an unlock is missing but its payout already exists, without paying twice", async () => {
    const { repository, useCase } = setup();
    // Data left over from some earlier partial state: the payout is there, the unlock is not.
    await repository.recordPoints({
      userId: ANA,
      amount: 50,
      reason: "achievement-unlocked",
      sourceId: "first-exercise",
      createdAt: T0,
    });

    const outcome = await useCase.execute({ userId: ANA, trigger: exercise(1) });

    expect(repository.unlocks.map((u) => u.achievementKey)).toEqual(["first-exercise"]);
    expect(outcome.pointsAwarded).toBe(10);
    expect(repository.transactions.filter((t) => t.sourceId === "first-exercise")).toHaveLength(1);
  });
});
