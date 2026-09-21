import {
  ACHIEVEMENT_ICON_IDS,
  isValidAchievementKey,
  isValidRewardSourceId,
  REWARD_REASONS,
} from "@tfm-bic/domain";
import { z } from "zod";

/**
 * Student-facing gamification shapes (M8). Allowlists like every other response schema — Zod
 * drops any key not named, so a user id can never be serialised — and language-neutral:
 * achievements are identified by a stable `key` and an `iconId`; the `title` and
 * `description` are the only localised strings, resolved on the server for the request's
 * language. None of these shapes has an input a client could use to *earn* points: the only
 * requests here are reads.
 */

const isoTimestamp = z.iso.datetime();

const achievementKey = z
  .string()
  .refine(isValidAchievementKey, { error: "Expected a lowercase slug such as first-exercise." });

const points = z.number().int().min(0);
const positivePoints = z.number().int().min(1);

const achievementIdentity = {
  key: achievementKey,
  title: z.string(),
  description: z.string(),
  iconId: z.enum(ACHIEVEMENT_ICON_IDS),
  rewardPoints: positivePoints,
};

/** An achievement a student has just unlocked, as reported in the response to the action that did it. */
export const unlockedAchievementResponseSchema = z.object(achievementIdentity);
export type UnlockedAchievementResponse = z.infer<typeof unlockedAchievementResponseSchema>;

/**
 * What an action earned the student, reported next to the action's own result. It is
 * information for the interface, never an input: the server has already decided and stored
 * it. `pointsAwarded` is the total of this action (a repeat or a wrong answer earns 0).
 */
export const rewardsResponseSchema = z.object({
  pointsAwarded: points,
  achievementsUnlocked: z.array(unlockedAchievementResponseSchema),
});
export type RewardsResponse = z.infer<typeof rewardsResponseSchema>;

/**
 * One line of the student's points history. `reason` and `sourceId` say *why* the points
 * were earned; `title` is the localised achievement title for an unlock and `null` otherwise.
 */
export const pointTransactionResponseSchema = z.object({
  id: z.number().int().min(1),
  amount: positivePoints,
  reason: z.enum(REWARD_REASONS),
  sourceId: z.string().refine(isValidRewardSourceId, { error: "Expected a lowercase slug." }),
  title: z.string().nullable(),
  createdAt: isoTimestamp,
});
export type PointTransactionResponse = z.infer<typeof pointTransactionResponseSchema>;

export const achievementProgressResponseSchema = z.object({
  current: points,
  target: positivePoints,
});

/** One achievement with this student's standing on it: locked or unlocked, and how far along. */
export const achievementResponseSchema = z.object({
  ...achievementIdentity,
  unlocked: z.boolean(),
  unlockedAt: isoTimestamp.nullable(),
  progress: achievementProgressResponseSchema,
});
export type AchievementResponse = z.infer<typeof achievementResponseSchema>;

export const achievementsResponseSchema = z.object({
  achievements: z.array(achievementResponseSchema),
  unlockedCount: points,
  totalCount: points,
});
export type AchievementsResponse = z.infer<typeof achievementsResponseSchema>;

/** The dashboard's view: total points, how many achievements, what is closest, and recent points. */
export const gamificationSummaryResponseSchema = z.object({
  totalPoints: points,
  achievements: z.object({ unlockedCount: points, totalCount: points }),
  inProgressAchievements: z.array(achievementResponseSchema),
  recentTransactions: z.array(pointTransactionResponseSchema),
});
export type GamificationSummaryResponse = z.infer<typeof gamificationSummaryResponseSchema>;

/**
 * `GET /gamification/summary` and `/achievements` take no parameters at all: the student is the
 * session's. Any query key — `userId` above all — is a `400`, so a client can never believe it
 * asked for someone else's data.
 */
export const gamificationQuerySchema = z.strictObject({});

const DEFAULT_HISTORY_PAGE_SIZE = 20;
export const MAX_HISTORY_PAGE_SIZE = 50;

/** A digits-only string: `Number("1e2")` and `Number("0x10")` are numbers, so a plain coercion would accept them. */
const wholeNumberText = z.string().regex(/^[1-9]\d{0,8}$/, { error: "Expected a whole number." });

/**
 * `GET /gamification/point-transactions?limit=&before=` — keyset paging, newest first.
 * `before` is the id of the last transaction of the previous page. Both are optional; a
 * repeated parameter, anything that is not plain digits and any other parameter — a `userId`,
 * say — is rejected rather than ignored.
 */
export const pointHistoryQuerySchema = z.strictObject({
  limit: wholeNumberText
    .transform(Number)
    .pipe(z.number().max(MAX_HISTORY_PAGE_SIZE))
    .default(DEFAULT_HISTORY_PAGE_SIZE),
  before: wholeNumberText.transform(Number).optional(),
});
export type PointHistoryQuery = z.infer<typeof pointHistoryQuerySchema>;

export const pointHistoryResponseSchema = z.object({
  transactions: z.array(pointTransactionResponseSchema),
  /** Pass as `before` to get the next page; `null` when this was the last one. */
  nextBefore: z.number().int().min(1).nullable(),
});
export type PointHistoryResponse = z.infer<typeof pointHistoryResponseSchema>;
