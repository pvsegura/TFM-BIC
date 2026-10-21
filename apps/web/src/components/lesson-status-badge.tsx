import type { LessonProgressResponse } from "@tfm-bic/contracts";

import { StatusBadge, type StatusTone } from "./status-badge.js";

type LessonStatus = LessonProgressResponse["status"];

const LABELS: Record<LessonStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

const TONES: Record<LessonStatus, StatusTone> = {
  not_started: "untouched",
  in_progress: "started",
  completed: "done",
};

/** A lesson's status in words. */
export function LessonStatusBadge({ status }: { status: LessonStatus }) {
  return (
    <StatusBadge
      status={status}
      label={LABELS[status]}
      tone={TONES[status]}
      doneTestId="completed-indicator"
    />
  );
}
