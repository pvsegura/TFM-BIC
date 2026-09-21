import { describe, expect, it } from "vitest";

import {
  createAchievementKey,
  isValidAchievementKey,
  type AchievementKey,
} from "./achievement-key.js";
import { AchievementRegistry, createDefaultAchievementRegistry } from "./achievement-registry.js";
import { completionCountRule, totalPointsRule } from "./achievement-rules.js";
import { isAchieved, progressToward } from "./achievement.js";
import { InvalidAchievementError } from "./errors/invalid-achievement.error.js";
import { factsFromTotals, type GamificationFacts } from "./gamification-facts.js";
import { findAchieved } from "./evaluate-achievements.js";
import type { GamificationEvent } from "./gamification-event.js";

const key = (value: string): AchievementKey => createAchievementKey(value);

function facts(overrides: {
  exercises?: number;
  lessons?: number;
  achievements?: number;
  points?: number;
}): GamificationFacts {
  return factsFromTotals([
    { reason: "exercise-completed", count: overrides.exercises ?? 0, points: 0 },
    { reason: "lesson-completed", count: overrides.lessons ?? 0, points: 0 },
    { reason: "achievement-unlocked", count: overrides.achievements ?? 0, points: 0 },
    // The total is whatever the ledger sums to; a bare number keeps these tests about the rule.
    ...(overrides.points === undefined
      ? []
      : [{ reason: "exercise-completed" as const, count: 0, points: overrides.points }]),
  ]);
}

const EXERCISE_DONE: GamificationEvent = { type: "exercise-completed", exerciseId: "pl-a-b" };
const LESSON_DONE: GamificationEvent = { type: "lesson-completed", lessonId: "pl-a" };
const POINTS: GamificationEvent = {
  type: "points-awarded",
  reason: "exercise-completed",
  amount: 10,
};

describe("achievement keys", () => {
  it.each(["first-exercise", "first-lesson", "ten-correct-exercises", "hundred-points"])(
    "accepts the language-neutral key %s",
    (value) => {
      expect(isValidAchievementKey(value)).toBe(true);
      expect(createAchievementKey(value)).toBe(value);
    },
  );

  it.each(["", "Primer ejercicio", "primer_ejercicio", "First-Exercise", "<b>x</b>", "a--b"])(
    "rejects %j",
    (value) => {
      expect(isValidAchievementKey(value)).toBe(false);
      expect(() => createAchievementKey(value)).toThrow(InvalidAchievementError);
    },
  );
});

describe("progress toward an achievement", () => {
  it("is achieved exactly when the current value reaches the target", () => {
    expect(isAchieved({ current: 9, target: 10 })).toBe(false);
    expect(isAchieved({ current: 10, target: 10 })).toBe(true);
    expect(isAchieved({ current: 11, target: 10 })).toBe(true);
  });

  it("never reports more than the target, so a bar cannot overflow", () => {
    expect(progressToward({ current: 250, target: 100 })).toEqual({ current: 100, target: 100 });
    expect(progressToward({ current: 40, target: 100 })).toEqual({ current: 40, target: 100 });
  });
});

describe("the default achievements", () => {
  const registry = createDefaultAchievementRegistry();
  const rule = (name: string) => {
    const found = registry.get(key(name));
    if (!found) {
      throw new Error(`missing rule ${name}`);
    }
    return found;
  };

  it("are the four initial ones, in a stable order, each worth 50 points", () => {
    expect(registry.all().map((r) => r.achievement.key)).toEqual([
      "first-exercise",
      "first-lesson",
      "ten-correct-exercises",
      "hundred-points",
    ]);
    for (const r of registry.all()) {
      expect(r.achievement.rewardPoints).toBe(50);
    }
  });

  describe("first-exercise", () => {
    it("is met by the first correctly completed exercise and not before", () => {
      expect(isAchieved(rule("first-exercise").progress(facts({ exercises: 0 })))).toBe(false);
      expect(isAchieved(rule("first-exercise").progress(facts({ exercises: 1 })))).toBe(true);
    });

    it("listens to exercise completions only", () => {
      expect(rule("first-exercise").triggers).toEqual(["exercise-completed"]);
    });
  });

  describe("first-lesson", () => {
    it("is met by the first completed lesson and not before", () => {
      expect(isAchieved(rule("first-lesson").progress(facts({ lessons: 0 })))).toBe(false);
      expect(isAchieved(rule("first-lesson").progress(facts({ lessons: 1 })))).toBe(true);
    });

    it("does not count exercises", () => {
      expect(isAchieved(rule("first-lesson").progress(facts({ exercises: 30 })))).toBe(false);
    });

    it("listens to lesson completions only", () => {
      expect(rule("first-lesson").triggers).toEqual(["lesson-completed"]);
    });
  });

  describe("ten-correct-exercises", () => {
    it("needs ten distinct exercises: nine is not enough", () => {
      const nine = rule("ten-correct-exercises").progress(facts({ exercises: 9 }));
      expect(nine).toEqual({ current: 9, target: 10 });
      expect(isAchieved(nine)).toBe(false);
      expect(isAchieved(rule("ten-correct-exercises").progress(facts({ exercises: 10 })))).toBe(
        true,
      );
    });

    it("counts rewarded exercises — one reward per exercise, however many attempts", () => {
      // The ledger holds one exercise-completed row per distinct exercise, so ten attempts at one
      // exercise are one row and cannot satisfy the rule.
      expect(rule("ten-correct-exercises").progress(facts({ exercises: 1 })).current).toBe(1);
    });
  });

  describe("hundred-points", () => {
    it("is met from 100 accumulated points, not at 99", () => {
      expect(isAchieved(rule("hundred-points").progress(facts({ points: 99 })))).toBe(false);
      expect(isAchieved(rule("hundred-points").progress(facts({ points: 100 })))).toBe(true);
      expect(isAchieved(rule("hundred-points").progress(facts({ points: 5000 })))).toBe(true);
    });

    it("listens to points being awarded", () => {
      expect(rule("hundred-points").triggers).toEqual(["points-awarded"]);
    });
  });
});

describe("facts from the ledger", () => {
  it("sums the points and counts the rewards per reason", () => {
    const result = factsFromTotals([
      { reason: "exercise-completed", count: 3, points: 30 },
      { reason: "lesson-completed", count: 1, points: 25 },
    ]);

    expect(result.totalPoints).toBe(55);
    expect(result.rewardCounts).toEqual({
      "exercise-completed": 3,
      "lesson-completed": 1,
      "achievement-unlocked": 0,
    });
  });

  it("is all zeros for a student with no rewards", () => {
    expect(factsFromTotals([])).toEqual({
      totalPoints: 0,
      rewardCounts: {
        "exercise-completed": 0,
        "lesson-completed": 0,
        "achievement-unlocked": 0,
      },
    });
  });
});

describe("findAchieved — which achievements an event newly unlocks", () => {
  const registry = createDefaultAchievementRegistry();

  it("returns the achievements the event can trigger whose criterion is now met", () => {
    const achieved = findAchieved(registry, [EXERCISE_DONE], facts({ exercises: 1 }), new Set());

    expect(achieved.map((r) => r.achievement.key)).toEqual(["first-exercise"]);
  });

  it("does not evaluate an achievement the event cannot trigger, even if its criterion is met", () => {
    // A lesson is done and the ledger says so, but only an exercise event arrived.
    const achieved = findAchieved(registry, [EXERCISE_DONE], facts({ lessons: 1 }), new Set());

    expect(achieved).toEqual([]);
  });

  it("never returns an achievement that is already unlocked", () => {
    const achieved = findAchieved(
      registry,
      [EXERCISE_DONE],
      facts({ exercises: 12 }),
      new Set([key("first-exercise")]),
    );

    expect(achieved.map((r) => r.achievement.key)).toEqual(["ten-correct-exercises"]);
  });

  it("considers every event it is given", () => {
    const achieved = findAchieved(
      registry,
      [EXERCISE_DONE, LESSON_DONE, POINTS],
      facts({ exercises: 1, lessons: 1, points: 100 }),
      new Set(),
    );

    expect(achieved.map((r) => r.achievement.key)).toEqual([
      "first-exercise",
      "first-lesson",
      "hundred-points",
    ]);
  });

  it("returns nothing when nothing is met", () => {
    expect(findAchieved(registry, [EXERCISE_DONE], facts({}), new Set())).toEqual([]);
  });
});

describe("AchievementRegistry", () => {
  it("adding an achievement is adding a rule — nothing else has to change", () => {
    const fifty = completionCountRule({
      key: key("fifty-correct-exercises"),
      iconId: "target",
      reason: "exercise-completed",
      trigger: "exercise-completed",
      target: 50,
    });
    const registry = new AchievementRegistry([...createDefaultAchievementRegistry().all(), fifty]);

    const achieved = findAchieved(registry, [EXERCISE_DONE], facts({ exercises: 50 }), new Set());
    expect(achieved.map((r) => r.achievement.key)).toContain("fifty-correct-exercises");
  });

  it("rejects two achievements with the same key", () => {
    const rule = totalPointsRule({ key: key("dup-points"), iconId: "star", target: 5 });
    expect(() => new AchievementRegistry([rule, rule])).toThrow(InvalidAchievementError);
  });

  it("rejects a rule with an invalid reward, an empty trigger list or a non-positive target", () => {
    const base = totalPointsRule({ key: key("some-points"), iconId: "star", target: 5 });
    expect(
      () =>
        new AchievementRegistry([
          { ...base, achievement: { ...base.achievement, rewardPoints: 0 } },
        ]),
    ).toThrow(InvalidAchievementError);
    expect(() => new AchievementRegistry([{ ...base, triggers: [] }])).toThrow(
      InvalidAchievementError,
    );
    expect(
      () =>
        new AchievementRegistry([
          totalPointsRule({ key: key("zero-target"), iconId: "star", target: 0 }),
        ]),
    ).toThrow(InvalidAchievementError);
  });

  it("looks a rule up by key and reports an unknown key as absent", () => {
    const registry = createDefaultAchievementRegistry();
    expect(registry.get(key("first-exercise"))?.achievement.key).toBe("first-exercise");
    expect(registry.get(key("no-such-achievement"))).toBeUndefined();
  });

  it("selects the rules an event type can trigger, in catalog order", () => {
    const registry = createDefaultAchievementRegistry();
    expect(registry.triggeredBy(["exercise-completed"]).map((r) => r.achievement.key)).toEqual([
      "first-exercise",
      "ten-correct-exercises",
    ]);
    expect(
      registry.triggeredBy(["points-awarded", "lesson-completed"]).map((r) => r.achievement.key),
    ).toEqual(["first-lesson", "hundred-points"]);
    expect(registry.triggeredBy([])).toEqual([]);
  });
});
