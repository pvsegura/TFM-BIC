/**
 * How far along something is, from untouched to done. Told apart by the words (always shown), a
 * check mark for done and the border or fill style — never by colour alone — and readable on both
 * themes: text is always the navy/off-white foreground.
 */
export type StatusTone = "untouched" | "started" | "advanced" | "done";

const TONE_CLASSES: Record<StatusTone, string> = {
  untouched: "border-dashed border-primary/40 dark:border-surface/40",
  started: "border-accent bg-accent/15",
  advanced: "border-accent bg-accent/30",
  done: "border-transparent bg-primary text-surface dark:bg-surface dark:text-primary",
};

export interface StatusBadgeProps {
  /** The status value itself, exposed as `data-status`. */
  status: string;
  label: string;
  tone: StatusTone;
  /** Test id of the check mark shown when `tone` is `done`. */
  doneTestId: string;
}

/** A status in words. Presentation only: it is given a status and shows it — it decides nothing. */
export function StatusBadge({ status, label, tone, doneTestId }: StatusBadgeProps) {
  return (
    <span
      data-status={status}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {tone === "done" ? (
        <span aria-hidden="true" data-testid={doneTestId}>
          ✓
        </span>
      ) : null}
      {label}
    </span>
  );
}
