import {
  progressToward,
  type AchievementDefinition,
  type AchievementIconId,
  type AchievementKey,
  type AchievementProgress,
  type AchievementRegistry,
  type GamificationFacts,
  type PointTransaction,
  type RewardReason,
} from "@tfm-bic/domain";

import type { AchievementTexts } from "./achievement-texts.js";
import type { UserAchievement } from "./ports/gamification-repository.js";
import type { RewardOutcome } from "./use-cases/award-rewards.use-case.js";

/** An achievement as a student sees it: language-neutral identity, localised words, their standing. */
export interface AchievementView {
  key: AchievementKey;
  title: string;
  description: string;
  iconId: AchievementIconId;
  rewardPoints: number;
  unlocked: boolean;
  unlockedAt: Date | null;
  progress: AchievementProgress;
}

/** An achievement that was just unlocked, as reported next to the action that unlocked it. */
export interface UnlockedAchievementView {
  key: AchievementKey;
  title: string;
  description: string;
  iconId: AchievementIconId;
  rewardPoints: number;
}

/** What an action earned. `pointsAwarded` is `0` and the list empty for a repeat or a wrong answer. */
export interface RewardsView {
  pointsAwarded: number;
  achievementsUnlocked: UnlockedAchievementView[];
}

export interface PointTransactionView {
  id: number;
  amount: number;
  reason: RewardReason;
  sourceId: string;
  /** The localised achievement title for an unlock; `null` for every other reason. */
  title: string | null;
  createdAt: Date;
}

export const NO_REWARDS_VIEW: RewardsView = { pointsAwarded: 0, achievementsUnlocked: [] };

function toUnlockedView(
  definition: AchievementDefinition,
  texts: AchievementTexts,
  locale: string,
): UnlockedAchievementView {
  const { title, description } = texts.describe(definition.key, locale);
  return {
    key: definition.key,
    title,
    description,
    iconId: definition.iconId,
    rewardPoints: definition.rewardPoints,
  };
}

export function toRewardsView(
  outcome: RewardOutcome,
  texts: AchievementTexts,
  locale: string,
): RewardsView {
  return {
    pointsAwarded: outcome.pointsAwarded,
    achievementsUnlocked: outcome.unlocked.map((definition) =>
      toUnlockedView(definition, texts, locale),
    ),
  };
}

/**
 * Every achievement in catalog order with the student's standing on it, from one set of facts
 * and one list of unlocks — no lookup per achievement. An unlock whose key is no longer in the
 * catalog (a retired achievement) is simply not shown.
 */
export function toAchievementViews(
  registry: AchievementRegistry,
  texts: AchievementTexts,
  locale: string,
  facts: GamificationFacts,
  unlocks: readonly UserAchievement[],
): AchievementView[] {
  const unlockedAt = new Map(unlocks.map((u) => [u.achievementKey, u.unlockedAt]));

  return registry.all().map((rule) => {
    const { key } = rule.achievement;
    const when = unlockedAt.get(key) ?? null;
    return {
      ...toUnlockedView(rule.achievement, texts, locale),
      unlocked: when !== null,
      unlockedAt: when,
      progress: progressToward(rule.progress(facts)),
    };
  });
}

export function toPointTransactionView(
  transaction: PointTransaction,
  registry: AchievementRegistry,
  texts: AchievementTexts,
  locale: string,
): PointTransactionView {
  const rule =
    transaction.reason === "achievement-unlocked"
      ? registry.get(transaction.sourceId as AchievementKey)
      : undefined;

  return {
    id: transaction.id,
    amount: transaction.amount,
    reason: transaction.reason,
    sourceId: transaction.sourceId,
    title: rule ? texts.describe(rule.achievement.key, locale).title : null,
    createdAt: transaction.createdAt,
  };
}
