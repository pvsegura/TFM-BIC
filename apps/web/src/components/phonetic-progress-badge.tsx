import type { PhoneticUserProgressResponse } from "@verbysia/contracts";

import { StatusBadge, type StatusTone } from "./status-badge.js";

type PhoneticProgressStatus = PhoneticUserProgressResponse["status"];

const LABELS: Record<PhoneticProgressStatus, string> = {
  not_started: "Not started",
  viewed: "Viewed",
  practiced: "Practiced",
  completed: "Completed",
};

const TONES: Record<PhoneticProgressStatus, StatusTone> = {
  not_started: "untouched",
  viewed: "started",
  practiced: "advanced",
  completed: "done",
};

/** A student's own progress on one phonetic representation, in words. */
export function PhoneticProgressBadge({ status }: { status: PhoneticProgressStatus }) {
  return (
    <StatusBadge
      status={status}
      label={LABELS[status]}
      tone={TONES[status]}
      doneTestId="completed-indicator"
    />
  );
}
