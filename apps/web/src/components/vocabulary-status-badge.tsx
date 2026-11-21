import type { VocabularyUserStateResponse } from "@verbysia/contracts";

import { StatusBadge, type StatusTone } from "./status-badge.js";

type VocabularyStatus = VocabularyUserStateResponse["status"];

const LABELS: Record<VocabularyStatus, string> = {
  new: "Not saved",
  saved: "Saved",
  learning: "Learning",
  learned: "Learned",
};

const TONES: Record<VocabularyStatus, StatusTone> = {
  new: "untouched",
  saved: "started",
  learning: "advanced",
  learned: "done",
};

/** A student's own relationship to one word, in words. */
export function VocabularyStatusBadge({ status }: { status: VocabularyStatus }) {
  return (
    <StatusBadge
      status={status}
      label={LABELS[status]}
      tone={TONES[status]}
      doneTestId="learned-indicator"
    />
  );
}
