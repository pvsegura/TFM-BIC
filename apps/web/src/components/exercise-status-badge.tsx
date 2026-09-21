import type { ExerciseResultResponse } from "@tfm-bic/contracts";

type ResultStatus = ExerciseResultResponse["status"];

const LABELS: Record<ResultStatus, string> = {
  unanswered: "Not answered",
  correct: "Correct",
  incorrect: "Not correct",
};

/** Told apart by their words (always shown), a mark and the border or fill style — never by
 * colour alone — and all readable on both themes: the text is always the navy/off-white foreground. */
const STYLES: Record<ResultStatus, string> = {
  unanswered: "border-dashed border-primary/40 dark:border-surface/40",
  correct: "border-transparent bg-primary text-surface dark:bg-surface dark:text-primary",
  incorrect: "border-accent bg-accent/15",
};

const MARKS: Partial<Record<ResultStatus, string>> = { correct: "✓", incorrect: "✗" };

/**
 * A student's result on one exercise, in words: the outcome of their *latest*
 * attempt. Presentation only — it is given a status and shows it; it decides
 * nothing.
 */
export function ExerciseStatusBadge({ status }: { status: ResultStatus }) {
  const mark = MARKS[status];
  return (
    <span
      data-status={status}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {mark ? (
        <span aria-hidden="true" data-testid="status-indicator">
          {mark}
        </span>
      ) : null}
      {LABELS[status]}
    </span>
  );
}
