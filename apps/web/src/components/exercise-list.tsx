import type { ExerciseSummaryResponse } from "@tfm-bic/contracts";
import { Link } from "react-router";

import { exerciseTypeLabel } from "./exercise-view-registry.js";
import { ExerciseStatusBadge } from "./exercise-status-badge.js";

export interface ExerciseListProps {
  /** Already in display order — the API sorts by explicit `order`. */
  exercises: readonly ExerciseSummaryResponse[];
  getHref: (exercise: ExerciseSummaryResponse) => string;
}

/** What the single link does, by the student's latest result: the visible words, and the fuller name a screen reader hears (it always contains the visible words). */
function actionFor(status: ExerciseSummaryResponse["result"]["status"], position: number) {
  const n = String(position);
  switch (status) {
    case "unanswered":
      return { text: "Start", name: `Start exercise ${n}` };
    case "incorrect":
      return { text: "Try again", name: `Try again: exercise ${n}` };
    case "correct":
      return { text: "Practise again", name: `Practise again: exercise ${n}` };
  }
}

/**
 * A lesson's exercises as a named, ordered list. Exercises are numbered by their
 * place in the list, not by the internal `order` value (which has gaps on
 * purpose). Each row shows what kind of exercise it is, its prompt, the student's
 * latest result in words and one link. The row is built from the list response,
 * which carries no options and no answer key, so there is none to show. Text is
 * rendered as text and tagged with the language it is written in.
 */
export function ExerciseList({ exercises, getHref }: ExerciseListProps) {
  return (
    <ol aria-label="Exercises" className="grid gap-3">
      {exercises.map((exercise, index) => {
        const position = index + 1;
        const action = actionFor(exercise.result.status, position);
        return (
          <li
            key={exercise.id}
            className="rounded-lg border border-primary/20 px-4 py-4 dark:border-surface/20"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-primary/70 dark:text-surface/70">
                Exercise {position} · <span>{exerciseTypeLabel(exercise.type)}</span>
              </p>
              <ExerciseStatusBadge status={exercise.result.status} />
            </div>
            <p lang={exercise.instructionLanguage} className="mt-2 break-words">
              {exercise.prompt}
            </p>
            <Link
              to={getHref(exercise)}
              aria-label={action.name}
              className="mt-3 inline-flex min-h-11 items-center rounded-md border border-primary px-4 py-2 text-sm font-medium transition-colors hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-surface dark:hover:bg-surface/10"
            >
              {action.text}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
