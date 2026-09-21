import type { LessonSummaryResponse } from "@tfm-bic/contracts";
import { Link } from "react-router";

import { LessonStatusBadge } from "./lesson-status-badge.js";

export interface LessonCardProps {
  lesson: LessonSummaryResponse;
  /** The lesson's place in the ordered list, starting at 1. */
  position: number;
  href: string;
}

const ACTION_LABELS: Record<LessonSummaryResponse["progress"]["status"], string> = {
  not_started: "Start lesson",
  in_progress: "Continue lesson",
  completed: "Review lesson",
};

/**
 * One lesson in a list: position, title, description, status and a single
 * action. Presentation only — it receives the lesson and where to go and holds
 * no rules. The title is a heading, not a second link to the same page, so a
 * screen reader hears one link per lesson, named "<action>: <title>". Text is
 * rendered as text, never as markup, and is tagged with the language it is
 * written in (the instruction language).
 */
export function LessonCard({ lesson, position, href }: LessonCardProps) {
  const action = ACTION_LABELS[lesson.progress.status];

  return (
    <li className="rounded-lg border border-primary/20 px-4 py-4 dark:border-surface/20">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-primary/70 dark:text-surface/70">
          Lesson {position}
        </p>
        <LessonStatusBadge status={lesson.progress.status} />
      </div>
      <h3 className="mt-1 text-lg font-semibold" lang={lesson.instructionLanguage}>
        {lesson.title}
      </h3>
      <p lang={lesson.instructionLanguage} className="mt-1 text-primary/70 dark:text-surface/70">
        {lesson.description}
      </p>
      <Link
        to={href}
        aria-label={`${action}: ${lesson.title}`}
        className="mt-3 inline-flex items-center rounded-md border border-primary px-4 py-2 text-sm font-medium transition-colors hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-surface dark:hover:bg-surface/10"
      >
        {action}
      </Link>
    </li>
  );
}
