import type { VocabularyUserStateResponse } from "@verbysia/contracts";

import { StatusBadge, type StatusTone } from "./status-badge.js";
import { m } from "../i18n/index.js";

type VocabularyStatus = VocabularyUserStateResponse["status"];

const LABELS: Record<VocabularyStatus, string> = {
  new: m.vocabulary.statuses.new,
  saved: m.vocabulary.statuses.saved,
  learning: m.vocabulary.statuses.learning,
  learned: m.vocabulary.statuses.learned,
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
