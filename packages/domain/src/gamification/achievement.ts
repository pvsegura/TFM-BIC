import type { AchievementKey } from "./achievement-key.js";
import type { GamificationEventType } from "./gamification-event.js";
import type { GamificationFacts } from "./gamification-facts.js";

/**
 * A symbolic name for the picture that goes with an achievement — never a file path or
 * markup. The front end decides how each one is drawn, so the domain stays free of any
 * presentation.
 */
export const ACHIEVEMENT_ICON_IDS = ["spark", "book", "target", "star"] as const;
export type AchievementIconId = (typeof ACHIEVEMENT_ICON_IDS)[number];

/** The language-neutral part of an achievement. Title and description are localised elsewhere. */
export interface AchievementDefinition {
  readonly key: AchievementKey;
  readonly iconId: AchievementIconId;
  /** Points granted, once, when the achievement is unlocked. */
  readonly rewardPoints: number;
}

/** How far a student is toward an achievement: a count against a target. */
export interface AchievementProgress {
  readonly current: number;
  readonly target: number;
}

/**
 * The strategy for one achievement: which one it evaluates, which events can trigger the
 * evaluation, and whether — and how far — a student's facts meet it. Adding an achievement
 * is adding a rule to the registry; no shared function grows a branch.
 */
export interface AchievementRule {
  readonly achievement: AchievementDefinition;
  readonly triggers: readonly GamificationEventType[];
  progress(facts: GamificationFacts): AchievementProgress;
}

export function isAchieved(progress: AchievementProgress): boolean {
  return progress.current >= progress.target;
}

/** Progress for display: never above the target, so a bar cannot overflow. */
export function progressToward(progress: AchievementProgress): AchievementProgress {
  return { current: Math.min(progress.current, progress.target), target: progress.target };
}
