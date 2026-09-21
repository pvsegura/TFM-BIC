import type { LessonProgressResponse } from "@tfm-bic/contracts";

type LessonStatus = LessonProgressResponse["status"];

const LABELS: Record<LessonStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

/** All three are readable on both themes: text is always the navy/off-white
 * foreground, and the status is told apart by its words (always shown), a check
 * mark and the fill or border style — never by colour alone. */
const STYLES: Record<LessonStatus, string> = {
  not_started: "border-dashed border-primary/40 dark:border-surface/40",
  in_progress: "border-accent bg-accent/15",
  completed: "border-transparent bg-primary text-surface dark:bg-surface dark:text-primary",
};

/**
 * A lesson's status in words. Presentation only: it is given a status and shows
 * it — it decides nothing.
 */
export function LessonStatusBadge({ status }: { status: LessonStatus }) {
  return (
    <span
      data-status={status}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {status === "completed" ? (
        <span aria-hidden="true" data-testid="completed-indicator">
          ✓
        </span>
      ) : null}
      {LABELS[status]}
    </span>
  );
}
