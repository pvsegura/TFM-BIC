import type { AchievementKey } from "./achievement-key.js";
import type { AchievementIconId, AchievementRule } from "./achievement.js";
import type { GamificationEventType } from "./gamification-event.js";
import { ACHIEVEMENT_UNLOCK_POINTS } from "./point-amount.js";
import type { RewardReason } from "./reward-reason.js";

interface RuleBase {
  key: AchievementKey;
  iconId: AchievementIconId;
  target: number;
  rewardPoints?: number;
}

/**
 * "Has been rewarded for `target` distinct `reason` sources": for example ten distinct
 * exercises. Counts rewards, and each source is rewarded once, so repeating one exercise a
 * hundred times still counts as one.
 */
export function completionCountRule(
  spec: RuleBase & { reason: RewardReason; trigger: GamificationEventType },
): AchievementRule {
  return {
    achievement: {
      key: spec.key,
      iconId: spec.iconId,
      rewardPoints: spec.rewardPoints ?? ACHIEVEMENT_UNLOCK_POINTS,
    },
    triggers: [spec.trigger],
    progress: (facts) => ({ current: facts.rewardCounts[spec.reason], target: spec.target }),
  };
}

/** "Has accumulated at least `target` points" — evaluated whenever points are awarded. */
export function totalPointsRule(spec: RuleBase): AchievementRule {
  return {
    achievement: {
      key: spec.key,
      iconId: spec.iconId,
      rewardPoints: spec.rewardPoints ?? ACHIEVEMENT_UNLOCK_POINTS,
    },
    triggers: ["points-awarded"],
    progress: (facts) => ({ current: facts.totalPoints, target: spec.target }),
  };
}
