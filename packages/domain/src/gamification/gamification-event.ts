import type { RewardReason } from "./reward-reason.js";

/**
 * Something that happened in the domain that may make a student deserve an achievement.
 * Achievements are evaluated when one of these occurs — never on every read — and each
 * rule declares which of them can trigger it. The events are produced by the reward flow
 * itself, synchronously and in the same database transaction; there is no broker, but the
 * shape is what a later event-driven design would publish.
 */
export const GAMIFICATION_EVENT_TYPES = [
  "exercise-completed",
  "lesson-completed",
  "points-awarded",
] as const;
export type GamificationEventType = (typeof GAMIFICATION_EVENT_TYPES)[number];

export type GamificationEvent =
  | { readonly type: "exercise-completed"; readonly exerciseId: string }
  | { readonly type: "lesson-completed"; readonly lessonId: string }
  | { readonly type: "points-awarded"; readonly reason: RewardReason; readonly amount: number };
