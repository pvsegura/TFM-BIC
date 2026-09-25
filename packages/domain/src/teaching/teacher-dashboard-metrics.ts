/**
 * The definitions behind every number the teacher dashboard shows. They are deliberately plain
 * and explainable — there is no composite "progress score" — and each is documented in
 * docs/architecture/teacher-dashboard.md. All times are UTC instants.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** A student is *active* when their last learning activity is at most this many days old. */
export const ACTIVE_WINDOW_DAYS = 7;

/** The earliest instant that still counts as "active" at `now` (inclusive). */
export function activeSince(now: Date): Date {
  return new Date(now.getTime() - ACTIVE_WINDOW_DAYS * DAY_MS);
}

/**
 * *Last activity* is the latest of: a lesson started or completed (`lesson_progress.updated_at`)
 * and an exercise answered (`exercise_attempts.answered_at`). Points are a consequence of those
 * actions, so they add no separate signal. No activity at all is never active.
 */
export function isActiveStudent(lastActivityAt: Date | null, now: Date): boolean {
  return lastActivityAt !== null && lastActivityAt.getTime() >= activeSince(now).getTime();
}

/**
 * *Accuracy* = correct attempts / all attempts, as a whole percentage (rounded half up). Every
 * well-formed submission is an attempt in M7, so retries count: a student who needed three tries
 * scores lower than one who needed one. `null` when there are no attempts — that is "no data",
 * not 0%.
 */
export function accuracyPercent(correctAttempts: number, attempts: number): number | null {
  if (
    !Number.isInteger(correctAttempts) ||
    !Number.isInteger(attempts) ||
    correctAttempts < 0 ||
    correctAttempts > attempts
  ) {
    throw new RangeError("Correct attempts must be a whole number between 0 and all attempts.");
  }
  if (attempts === 0) {
    return null;
  }
  return Math.round((correctAttempts / attempts) * 100);
}

/** The Monday 00:00 UTC that starts the (ISO) week `instant` falls in. */
export function weekStartUtc(instant: Date): Date {
  const midnight = Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate());
  const daysSinceMonday = (instant.getUTCDay() + 6) % 7;
  return new Date(midnight - daysSinceMonday * DAY_MS);
}

/** The starts of the last `count` weeks, oldest first, the last one being the week of `now`. */
export function recentWeekStarts(now: Date, count: number): Date[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError("Week count must be a positive whole number.");
  }
  const current = weekStartUtc(now).getTime();
  return Array.from(
    { length: count },
    (_, index) => new Date(current - (count - 1 - index) * 7 * DAY_MS),
  );
}
