import type { AchievementKey } from "./achievement-key.js";
import type { AchievementRegistry } from "./achievement-registry.js";
import { isAchieved, type AchievementRule } from "./achievement.js";
import type { GamificationEvent } from "./gamification-event.js";
import type { GamificationFacts } from "./gamification-facts.js";

/**
 * Which achievements do these events newly unlock? Only the rules an event can trigger are
 * looked at, an achievement the student already has is never returned again, and the result
 * is in catalog order so the outcome is deterministic. Pure: it decides nothing about
 * storage — recording the unlock, and granting its reward, is the caller's job.
 */
export function findAchieved(
  registry: AchievementRegistry,
  events: readonly GamificationEvent[],
  facts: GamificationFacts,
  alreadyUnlocked: ReadonlySet<AchievementKey>,
): readonly AchievementRule[] {
  return registry
    .triggeredBy(events.map((event) => event.type))
    .filter(
      (rule) => !alreadyUnlocked.has(rule.achievement.key) && isAchieved(rule.progress(facts)),
    );
}
