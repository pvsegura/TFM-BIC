import type { LessonResponse } from "@tfm-bic/contracts";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { ContentBlocks, type LearningLanguage } from "./content-blocks.js";
import { LessonCompletion } from "./lesson-completion.js";
import { LessonStatusBadge } from "./lesson-status-badge.js";

export interface LessonViewerProps {
  lesson: LessonResponse;
  /** Locale and direction of the language being learned, from the catalog. */
  language: LearningLanguage;
  isCompleting: boolean;
  completionFailed: boolean;
  onComplete: () => void;
  backHref: string;
  /** What follows the lesson's blocks and comes before the completion action — the exercises (M7). The viewer knows nothing about it. */
  practice?: ReactNode;
}

/**
 * One lesson, read top to bottom as a single continuous page: title, description
 * and status, every block in the order the lesson gives them, then the explicit
 * completion action. There is deliberately no slide engine — the blocks are a
 * short ordered sequence, and a continuous page needs no state of its own, so
 * there is no "position in the lesson" to lose on refresh. Only the lesson's
 * status is persisted (resume position within a lesson is not part of M6).
 *
 * Blocks go through `ContentBlocks`, which maps each *known* type to a fixed
 * component, renders everything as text and shows a neutral notice for a type
 * it does not know. Generic: nothing here names a language.
 */
export function LessonViewer({
  lesson,
  language,
  isCompleting,
  completionFailed,
  onComplete,
  backHref,
  practice,
}: LessonViewerProps) {
  return (
    <article lang={lesson.instructionLanguage} className="mt-4">
      <header>
        <h1 className="text-2xl font-semibold">{lesson.title}</h1>
        <p className="mt-1 text-primary/70 dark:text-surface/70">{lesson.description}</p>
        <div className="mt-3">
          <LessonStatusBadge status={lesson.progress.status} />
        </div>
      </header>

      <div className="mt-6">
        <ContentBlocks
          blocks={lesson.blocks}
          language={language}
          instructionLanguage={lesson.instructionLanguage}
        />
      </div>

      {practice}

      <LessonCompletion
        status={lesson.progress.status}
        isSubmitting={isCompleting}
        hasError={completionFailed}
        onComplete={onComplete}
      />

      <p className="mt-6">
        <Link to={backHref} className="text-sm underline underline-offset-2">
          Back to lessons
        </Link>
      </p>
    </article>
  );
}
