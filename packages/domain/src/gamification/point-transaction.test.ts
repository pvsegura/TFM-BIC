import { describe, expect, it } from "vitest";

import { InvalidPointAmountError } from "./errors/invalid-point-amount.error.js";
import { InvalidPointTransactionError } from "./errors/invalid-point-transaction.error.js";
import { InvalidRewardSourceError } from "./errors/invalid-reward-source.error.js";
import {
  ACHIEVEMENT_UNLOCK_POINTS,
  EXERCISE_COMPLETION_POINTS,
  LESSON_COMPLETION_POINTS,
  MAX_POINT_AMOUNT,
  createPointAmount,
  isValidPointAmount,
} from "./point-amount.js";
import { createPointTransaction } from "./point-transaction.js";
import { REWARD_REASONS, isValidRewardReason, pointsFor } from "./reward-reason.js";
import { isValidRewardSourceId } from "./reward-source.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("point amounts", () => {
  it.each([1, 10, 25, 50, MAX_POINT_AMOUNT])("accepts %d", (amount) => {
    expect(isValidPointAmount(amount)).toBe(true);
    expect(createPointAmount(amount)).toBe(amount);
  });

  it.each([
    0,
    -10,
    -1,
    0.5,
    10.1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    MAX_POINT_AMOUNT + 1,
    Number.MAX_SAFE_INTEGER + 1,
  ])("rejects %s", (amount) => {
    expect(isValidPointAmount(amount)).toBe(false);
    expect(() => createPointAmount(amount)).toThrow(InvalidPointAmountError);
  });

  it("rejects a value that is not a number at all", () => {
    expect(isValidPointAmount("10")).toBe(false);
    expect(isValidPointAmount(null)).toBe(false);
    expect(isValidPointAmount(undefined)).toBe(false);
  });
});

describe("reward reasons and the reward rules", () => {
  it("names the three reasons a student can earn points", () => {
    expect([...REWARD_REASONS]).toEqual([
      "exercise-completed",
      "lesson-completed",
      "achievement-unlocked",
    ]);
  });

  it("recognises only those reasons", () => {
    expect(isValidRewardReason("exercise-completed")).toBe(true);
    expect(isValidRewardReason("give-me-points")).toBe(false);
    expect(isValidRewardReason("")).toBe(false);
  });

  it("awards 10 for an exercise, 25 for a lesson and 50 for an achievement", () => {
    expect(EXERCISE_COMPLETION_POINTS).toBe(10);
    expect(LESSON_COMPLETION_POINTS).toBe(25);
    expect(ACHIEVEMENT_UNLOCK_POINTS).toBe(50);
    expect(pointsFor("exercise-completed")).toBe(10);
    expect(pointsFor("lesson-completed")).toBe(25);
    expect(pointsFor("achievement-unlocked")).toBe(50);
  });
});

describe("reward source ids", () => {
  it.each(["pl-greetings-polite-hello", "pl-greetings", "first-exercise", "hundred-points"])(
    "accepts %s",
    (id) => {
      expect(isValidRewardSourceId(id)).toBe(true);
    },
  );

  it.each([
    "",
    "Pl-Greetings",
    "pl_greetings",
    "pl greetings",
    "../etc/passwd",
    "<script>",
    "x'; DROP TABLE point_transactions;--",
    `a${"-b".repeat(32)}`,
  ])("rejects %j", (id) => {
    expect(isValidRewardSourceId(id)).toBe(false);
  });
});

describe("createPointTransaction", () => {
  it("records who earned how much, why, for what, and when", () => {
    const transaction = createPointTransaction(
      { userId: "user-1", reason: "exercise-completed", sourceId: "pl-greetings-polite-hello" },
      NOW,
    );

    expect(transaction).toEqual({
      userId: "user-1",
      amount: 10,
      reason: "exercise-completed",
      sourceId: "pl-greetings-polite-hello",
      createdAt: NOW,
    });
  });

  it("takes the amount from the reward rule, never from the caller", () => {
    const lesson = createPointTransaction(
      { userId: "user-1", reason: "lesson-completed", sourceId: "pl-greetings" },
      NOW,
    );
    expect(lesson.amount).toBe(25);
  });

  it("defaults an achievement unlock to the standard achievement reward", () => {
    const unlock = createPointTransaction(
      { userId: "user-1", reason: "achievement-unlocked", sourceId: "first-exercise" },
      NOW,
    );
    expect(unlock.amount).toBe(50);
  });

  it("uses the achievement's own reward for an unlock", () => {
    const unlock = createPointTransaction(
      {
        userId: "user-1",
        reason: "achievement-unlocked",
        sourceId: "first-exercise",
        amount: 75,
      },
      NOW,
    );
    expect(unlock.amount).toBe(75);
  });

  it("rejects an invalid explicit amount", () => {
    expect(() =>
      createPointTransaction(
        { userId: "user-1", reason: "achievement-unlocked", sourceId: "a-b", amount: -5 },
        NOW,
      ),
    ).toThrow(InvalidPointAmountError);
  });

  it("rejects a malformed source id", () => {
    expect(() =>
      createPointTransaction(
        { userId: "user-1", reason: "exercise-completed", sourceId: "Bad Id" },
        NOW,
      ),
    ).toThrow(InvalidRewardSourceError);
  });

  it("rejects an unknown reason", () => {
    expect(() =>
      createPointTransaction(
        { userId: "user-1", reason: "bonus" as never, sourceId: "pl-first" },
        NOW,
      ),
    ).toThrow(InvalidPointTransactionError);
  });

  it("rejects an empty user id", () => {
    expect(() =>
      createPointTransaction(
        { userId: "", reason: "exercise-completed", sourceId: "pl-first" },
        NOW,
      ),
    ).toThrow(InvalidPointTransactionError);
  });

  it("returns a frozen record, so a transaction cannot be edited after the fact", () => {
    const transaction = createPointTransaction(
      { userId: "user-1", reason: "exercise-completed", sourceId: "pl-first" },
      NOW,
    );

    expect(Object.isFrozen(transaction)).toBe(true);
    expect(() => {
      (transaction as { amount: number }).amount = 1000;
    }).toThrow(TypeError);
  });
});
