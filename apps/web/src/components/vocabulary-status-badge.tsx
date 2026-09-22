import type { VocabularyUserStateResponse } from "@tfm-bic/contracts";

type VocabularyStatus = VocabularyUserStateResponse["status"];

const LABELS: Record<VocabularyStatus, string> = {
  new: "Not saved",
  saved: "Saved",
  learning: "Learning",
  learned: "Learned",
};

/** Told apart by their words (always shown), a mark and the border or fill style — never by
 * colour alone — and readable on both themes: text is always the navy/off-white foreground. */
const STYLES: Record<VocabularyStatus, string> = {
  new: "border-dashed border-primary/40 dark:border-surface/40",
  saved: "border-accent bg-accent/15",
  learning: "border-accent bg-accent/30",
  learned: "border-transparent bg-primary text-surface dark:bg-surface dark:text-primary",
};

/**
 * A student's own relationship to one word, in words. Presentation only: it is given a status and
 * shows it — it decides nothing.
 */
export function VocabularyStatusBadge({ status }: { status: VocabularyStatus }) {
  return (
    <span
      data-status={status}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {status === "learned" ? (
        <span aria-hidden="true" data-testid="learned-indicator">
          ✓
        </span>
      ) : null}
      {LABELS[status]}
    </span>
  );
}
