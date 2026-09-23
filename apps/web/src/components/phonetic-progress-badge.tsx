import type { PhoneticUserProgressResponse } from "@tfm-bic/contracts";

type PhoneticProgressStatus = PhoneticUserProgressResponse["status"];

const LABELS: Record<PhoneticProgressStatus, string> = {
  not_started: "Not started",
  viewed: "Viewed",
  practiced: "Practiced",
  completed: "Completed",
};

/** Told apart by their words (always shown), a mark and the border or fill style — never by
 * colour alone — and readable on both themes: text is always the navy/off-white foreground. */
const STYLES: Record<PhoneticProgressStatus, string> = {
  not_started: "border-dashed border-primary/40 dark:border-surface/40",
  viewed: "border-accent bg-accent/15",
  practiced: "border-accent bg-accent/30",
  completed: "border-transparent bg-primary text-surface dark:bg-surface dark:text-primary",
};

/**
 * A student's own progress on one phonetic representation, in words. Presentation only: it is
 * given a status and shows it — it decides nothing.
 */
export function PhoneticProgressBadge({ status }: { status: PhoneticProgressStatus }) {
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
