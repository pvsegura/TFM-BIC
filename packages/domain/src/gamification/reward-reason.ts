import {
  ACHIEVEMENT_UNLOCK_POINTS,
  EXERCISE_COMPLETION_POINTS,
  LESSON_COMPLETION_POINTS,
} from "./point-amount.js";

/**
 * Why a student was given points. Language-neutral stable keys — the label a student
 * reads is a presentation concern — and a closed set: a new way to earn points is a
 * new reason added here on purpose, never a free-form string a caller can invent.
 *
 * Each reason has one kind of source (what the reward is *for*): an exercise id, a lesson
 * id or an achievement key. Together with the user they identify a reward, which is what
 * makes granting it idempotent.
 */
export const REWARD_REASONS = [
  "exercise-completed",
  "lesson-completed",
  "achievement-unlocked",
] as const;
export type RewardReason = (typeof REWARD_REASONS)[number];

export function isValidRewardReason(value: string): value is RewardReason {
  return (REWARD_REASONS as readonly string[]).includes(value);
}

const DEFAULT_POINTS: Readonly<Record<RewardReason, number>> = {
  "exercise-completed": EXERCISE_COMPLETION_POINTS,
  "lesson-completed": LESSON_COMPLETION_POINTS,
  "achievement-unlocked": ACHIEVEMENT_UNLOCK_POINTS,
};

/** The standard worth of a reason. An achievement may define its own reward instead. */
export function pointsFor(reason: RewardReason): number {
  return DEFAULT_POINTS[reason];
}
