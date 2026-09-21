import { InvalidPointAmountError } from "./errors/invalid-point-amount.error.js";

/**
 * How many points each kind of reward is worth. These are the M8 reward rules, in one
 * place: nothing else in the system (and above all nothing in the browser) decides how
 * many points an action is worth.
 */
export const EXERCISE_COMPLETION_POINTS = 10;
export const LESSON_COMPLETION_POINTS = 25;
export const ACHIEVEMENT_UNLOCK_POINTS = 50;

/**
 * A sanity bound, not a game rule: a single reward is a handful of points, so a value
 * above this is a bug or an attack, never a real reward. The database CHECK mirrors it.
 */
export const MAX_POINT_AMOUNT = 10_000;

/**
 * A reward is always a whole, positive number of points. Points are only ever *earned*
 * in M8 (nothing is spent or taken back), so zero and negative amounts are refused — a
 * ledger row that changed nothing would be noise, and a negative one would be a
 * different feature (an adjustment) that needs its own rules.
 */
export function isValidPointAmount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 1 &&
    value <= MAX_POINT_AMOUNT
  );
}

export function createPointAmount(value: number): number {
  if (!isValidPointAmount(value)) {
    throw new InvalidPointAmountError(value);
  }
  return value;
}
