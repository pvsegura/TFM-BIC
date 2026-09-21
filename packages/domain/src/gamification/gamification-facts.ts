import { REWARD_REASONS, type RewardReason } from "./reward-reason.js";

/**
 * What the ledger says about one student — the only thing achievement rules look at. It is
 * derived from the points ledger (never stored a second time), which is also why it needs
 * no other context's tables: every distinct exercise or lesson that was ever completed has
 * exactly one reward row, so counting rewards *is* counting distinct completions.
 */
export interface GamificationFacts {
  readonly totalPoints: number;
  readonly rewardCounts: Readonly<Record<RewardReason, number>>;
}

/** One reason's slice of a student's ledger, as an aggregate query returns it. */
export interface RewardTotal {
  readonly reason: RewardReason;
  readonly count: number;
  readonly points: number;
}

export function factsFromTotals(totals: readonly RewardTotal[]): GamificationFacts {
  const rewardCounts = Object.fromEntries(REWARD_REASONS.map((reason) => [reason, 0])) as Record<
    RewardReason,
    number
  >;
  let totalPoints = 0;

  for (const total of totals) {
    rewardCounts[total.reason] += total.count;
    totalPoints += total.points;
  }

  return { totalPoints, rewardCounts };
}
