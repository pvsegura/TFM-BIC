import type { LessonProgressResponse } from "@verbysia/contracts";

import { StatusBadge, type StatusTone } from "./status-badge.js";
import { m } from "../i18n/index.js";

type LessonStatus = LessonProgressResponse["status"];

const LABELS: Record<LessonStatus, string> = {
  not_started: m.learn.lessons.statuses.not_started,
  in_progress: m.learn.lessons.statuses.in_progress,
  completed: m.learn.lessons.statuses.completed,
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
