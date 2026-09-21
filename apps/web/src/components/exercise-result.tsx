import type { ExerciseAnswerResponse } from "@tfm-bic/contracts";
import type { Ref } from "react";

import type { LearningLanguage } from "./content-blocks.js";
import { RewardNotice } from "./reward-notice.js";

export interface ExerciseResultProps {
  /** The server's verdict on the submitted answer, once there is one. */
  evaluation: ExerciseAnswerResponse | undefined;
  /** The correct answer as text (see `describeCorrectAnswer`), or `null` when it cannot be described. */
  correctAnswerText: string | null;
  instructionLanguage: string;
  learningLanguage: LearningLanguage | undefined;
  isChecking: boolean;
  /** The last submission could not be checked (network, server). Not a verdict. */
  failed: boolean;
  /** So the player can move focus here once a verdict arrives. */
  statusRef?: Ref<HTMLDivElement>;
}

/**
 * The outcome of an answer, in words. It presents the server's verdict and decides
 * nothing: correct or not, the correct answer and the feedback are exactly what
 * the API returned.
 *
 * The status region is in the page from the start, empty, because a live region
 * that is inserted already filled is often not announced; this way the verdict is
 * read out when it appears. Correctness is stated as the words "Correct" / "Not
 * quite" with a check or cross beside them, never by colour alone. The region is
 * focusable by script only (`tabIndex=-1`): the submit button is disabled once a
 * verdict shows, and without somewhere to put focus a keyboard user would be left
 * on nothing. Every string — including the exercise's own feedback — is rendered
 * as text. What the answer earned (M8) is the server's report and is shown inside the same
 * region, so it is announced with the verdict.
 */
export function ExerciseResult({
  evaluation,
  correctAnswerText,
  instructionLanguage,
  learningLanguage,
  isChecking,
  failed,
  statusRef,
}: ExerciseResultProps) {
  return (
    <section aria-label="Result" className="mt-6">
      <div
        ref={statusRef}
        role="status"
        tabIndex={-1}
        className="outline-none focus-visible:outline"
      >
        {isChecking ? <p>Checking your answer…</p> : null}
        {evaluation ? (
          <div
            data-correct={evaluation.correct}
            className="rounded-lg border-2 border-primary/40 px-4 py-4 dark:border-surface/40"
          >
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <span
                aria-hidden="true"
                data-testid="result-indicator"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm font-bold text-surface dark:bg-surface dark:text-primary"
              >
                {evaluation.correct ? "✓" : "✗"}
              </span>
              {evaluation.correct ? "Correct" : "Not quite"}
            </h2>
            {correctAnswerText === null ? null : (
              <p className="mt-2">
                Correct answer:{" "}
                <span
                  lang={learningLanguage?.locale}
                  dir={learningLanguage?.direction ?? "auto"}
                  className="font-medium"
                >
                  {correctAnswerText}
                </span>
              </p>
            )}
            {evaluation.feedback === null ? null : (
              <p lang={instructionLanguage} className="mt-2 text-primary/80 dark:text-surface/80">
                {evaluation.feedback}
              </p>
            )}
            <p className="mt-2 text-sm text-primary/70 dark:text-surface/70">
              Attempt {evaluation.result.attemptCount}
            </p>
            <RewardNotice rewards={evaluation.rewards} />
          </div>
        ) : null}
      </div>
      {failed ? (
        <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">
          We couldn&apos;t check your answer. Please try again.
        </p>
      ) : null}
    </section>
  );
}
