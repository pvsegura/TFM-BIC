import { InvalidPointTransactionError } from "./errors/invalid-point-transaction.error.js";
import { createPointAmount } from "./point-amount.js";
import { isValidRewardReason, pointsFor, type RewardReason } from "./reward-reason.js";
import { assertRewardSourceId } from "./reward-source.js";

/**
 * One line of the points ledger: a student earned an amount for a reason, tied to the
 * thing that earned it. The ledger is **append-only history** and the single source of
 * truth for points: a student's total is the sum of their transactions and "why do I
 * have these points?" is answered by reading them. Nothing is ever updated or deleted.
 *
 * `(userId, reason, sourceId)` is the reward's identity — at most one transaction may
 * exist for it — so granting the same reward twice is a no-op rather than a second payout.
 */
export interface NewPointTransaction {
  readonly userId: string;
  readonly amount: number;
  readonly reason: RewardReason;
  readonly sourceId: string;
  readonly createdAt: Date;
}

/** A stored transaction: the same, plus the ascending id storage assigned. */
export interface PointTransaction extends NewPointTransaction {
  readonly id: number;
}

/**
 * What a caller says about a reward. The amount is deliberately absent for an exercise or
 * a lesson: it comes from the reward rules, never from the caller. Only an achievement
 * unlock may name an amount, because each achievement defines its own reward.
 */
export type PointTransactionInput =
  | {
      readonly userId: string;
      readonly reason: "exercise-completed" | "lesson-completed";
      readonly sourceId: string;
    }
  | {
      readonly userId: string;
      readonly reason: "achievement-unlocked";
      readonly sourceId: string;
      readonly amount?: number;
    };

export function createPointTransaction(
  input: PointTransactionInput,
  now: Date,
): NewPointTransaction {
  if (input.userId === "") {
    throw new InvalidPointTransactionError("A point transaction needs a user.");
  }
  if (!isValidRewardReason(input.reason)) {
    throw new InvalidPointTransactionError(`"${String(input.reason)}" is not a reward reason.`);
  }

  const amount =
    input.reason === "achievement-unlocked" && input.amount !== undefined
      ? input.amount
      : pointsFor(input.reason);

  return Object.freeze({
    userId: input.userId,
    amount: createPointAmount(amount),
    reason: input.reason,
    sourceId: assertRewardSourceId(input.sourceId),
    createdAt: now,
  });
}
