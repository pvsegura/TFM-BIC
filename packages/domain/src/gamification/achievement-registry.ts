import { createAchievementKey, type AchievementKey } from "./achievement-key.js";
import type { AchievementRule } from "./achievement.js";
import { completionCountRule, totalPointsRule } from "./achievement-rules.js";
import { InvalidAchievementError } from "./errors/invalid-achievement.error.js";
import type { GamificationEventType } from "./gamification-event.js";
import type { GamificationFacts } from "./gamification-facts.js";
import { isValidPointAmount } from "./point-amount.js";

const NO_FACTS: GamificationFacts = {
  totalPoints: 0,
  rewardCounts: { "exercise-completed": 0, "lesson-completed": 0, "achievement-unlocked": 0 },
};

/**
 * Every achievement the product knows, as rules, in a stable display order. It is a
 * validated collection — unique keys, a valid reward, a target that can be reached, at
 * least one trigger — so a broken rule stops the server at start-up instead of quietly
 * never (or always) unlocking. It is code, like the CEFR levels, not a table: the rules
 * are code, so a second copy in a database would only be something to keep in sync.
 */
export class AchievementRegistry {
  private readonly byKey = new Map<string, AchievementRule>();

  constructor(private readonly rules: readonly AchievementRule[]) {
    for (const rule of rules) {
      const { key, rewardPoints } = rule.achievement;
      if (this.byKey.has(key)) {
        throw new InvalidAchievementError(`Achievement "${key}" is defined more than once.`);
      }
      if (!isValidPointAmount(rewardPoints)) {
        throw new InvalidAchievementError(`Achievement "${key}" has an invalid reward.`);
      }
      if (rule.triggers.length === 0) {
        throw new InvalidAchievementError(
          `Achievement "${key}" has no trigger, so it could never unlock.`,
        );
      }
      // A rule's target is fixed, so asking it about a student with nothing reads it.
      const { target } = rule.progress(NO_FACTS);
      if (!Number.isSafeInteger(target) || target < 1) {
        throw new InvalidAchievementError(`Achievement "${key}" needs a target of at least 1.`);
      }
      this.byKey.set(key, rule);
    }
  }

  all(): readonly AchievementRule[] {
    return this.rules;
  }

  get(key: AchievementKey): AchievementRule | undefined {
    return this.byKey.get(key);
  }

  /** The rules any of these event types can trigger, in catalog order. */
  triggeredBy(eventTypes: readonly GamificationEventType[]): readonly AchievementRule[] {
    return this.rules.filter((rule) => rule.triggers.some((type) => eventTypes.includes(type)));
  }
}

const key = createAchievementKey;

/** The achievements of M8. New ones are added here as rules. */
export function createDefaultAchievementRegistry(): AchievementRegistry {
  return new AchievementRegistry([
    completionCountRule({
      key: key("first-exercise"),
      iconId: "spark",
      reason: "exercise-completed",
      trigger: "exercise-completed",
      target: 1,
    }),
    completionCountRule({
      key: key("first-lesson"),
      iconId: "book",
      reason: "lesson-completed",
      trigger: "lesson-completed",
      target: 1,
    }),
    completionCountRule({
      key: key("ten-correct-exercises"),
      iconId: "target",
      reason: "exercise-completed",
      trigger: "exercise-completed",
      target: 10,
    }),
    totalPointsRule({ key: key("hundred-points"), iconId: "star", target: 100 }),
  ]);
}
