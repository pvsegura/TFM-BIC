import type { LessonProgressResponse, RewardsResponse } from "@tfm-bic/contracts";
import { Button } from "@tfm-bic/ui";

import { RewardNotice } from "./reward-notice.js";

export interface LessonCompletionProps {
  status: LessonProgressResponse["status"];
  isSubmitting: boolean;
  hasError: boolean;
  onComplete: () => void;
  /** What completing just earned, as the server reported it. Absent when nothing was reported (a page reload). */
  rewards?: RewardsResponse;
}

/**
 * The end of a lesson: one explicit "Complete lesson" action, or — once the
 * server says the lesson is completed — a confirmation. It decides nothing: the
 * status it shows is whatever the server persisted, and completing is only ever
 * requested by a click.
 *
 * The status region stays in the page from the start (empty until completion),
 * because a live region that is inserted already filled is often not announced;
 * this way the confirmation is read out when it appears. The button is disabled
 * while saving, so it cannot be submitted twice.
 */
export function LessonCompletion({
  status,
  isSubmitting,
  hasError,
  onComplete,
  rewards,
}: LessonCompletionProps) {
  const completed = status === "completed";

  return (
    <section
      aria-labelledby="lesson-completion-heading"
      className="mt-8 border-t border-primary/20 pt-6 dark:border-surface/20"
    >
      <h2 id="lesson-completion-heading" className="text-lg font-semibold">
        Finished this lesson?
      </h2>
      <div role="status" className="mt-2">
        {completed ? (
          <p className="flex items-center gap-2 font-medium">
            <span
              aria-hidden="true"
              data-testid="completion-check"
              className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-surface dark:bg-surface dark:text-primary"
            >
              ✓
            </span>
            Lesson completed. You can read it again any time.
          </p>
        ) : null}
        {completed && rewards ? <RewardNotice rewards={rewards} /> : null}
      </div>
      {completed ? null : (
        <>
          {hasError ? (
            <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">
              We couldn&apos;t save your progress. Please try again.
            </p>
          ) : null}
          <Button className="mt-3" onClick={onComplete} disabled={isSubmitting}>
            {isSubmitting ? "Completing…" : "Complete lesson"}
          </Button>
        </>
      )}
    </section>
  );
}
