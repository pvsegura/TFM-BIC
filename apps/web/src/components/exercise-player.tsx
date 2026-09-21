import type { ExerciseAnswerResponse, ExerciseResponse } from "@tfm-bic/contracts";
import { Button } from "@tfm-bic/ui";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import type { LearningLanguage } from "./content-blocks.js";
import { ExerciseRenderer } from "./exercise-renderer.js";
import { ExerciseResult } from "./exercise-result.js";
import { describeCorrectAnswer, exerciseTypeLabel } from "./exercise-view-registry.js";
import type { SubmittedAnswer } from "./exercise-view-types.js";

export interface ExercisePlayerProps {
  exercise: ExerciseResponse;
  language: LearningLanguage | undefined;
  /** The exercise's place in its lesson, from 1; `null` when the lesson's list is not known. */
  position: number | null;
  total: number | null;
  /** Where "Next exercise" goes, or `null` when this is the last one. */
  nextHref: string | null;
  lessonHref: string;
  /** Every exercise of the lesson has been answered at least once (the server's count). */
  lessonFinished: boolean;
  /** The server's verdict on the answer just submitted; cleared by `onRetry`. */
  evaluation: ExerciseAnswerResponse | undefined;
  isSubmitting: boolean;
  submitFailed: boolean;
  onSubmit: (answer: SubmittedAnswer) => void;
  onRetry: () => void;
}

const PRIMARY_LINK =
  "inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-primary transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const PLAIN_LINK = "text-sm underline underline-offset-2";

/**
 * The exercise experience: load it, see the prompt, answer, see the verdict,
 * retry or continue. It is presentation and flow only — it holds no rules and no
 * answer key:
 *
 * - the exercise itself is drawn by `ExerciseRenderer`, which picks the view for
 *   its type (no per-language or per-type branching here);
 * - the verdict, the correct answer and the feedback are shown exactly as the server
 *   returned them (`ExerciseResult`); nothing is judged in the browser;
 * - once a verdict shows, the controls are read-only and focus moves to the result
 *   so a keyboard user is not stranded;
 * - **retry** is allowed and is a fresh start: the view is remounted (empty, focus
 *   on its first control) and the next answer is another attempt on the server —
 *   earlier attempts are never touched;
 * - the way on is always clear: the next exercise, or back to the lesson.
 */
export function ExercisePlayer({
  exercise,
  language,
  position,
  total,
  nextHref,
  lessonHref,
  lessonFinished,
  evaluation,
  isSubmitting,
  submitFailed,
  onSubmit,
  onRetry,
}: ExercisePlayerProps) {
  const [attempt, setAttempt] = useState(0);
  const statusRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const focusAfterRetry = useRef(false);

  useEffect(() => {
    if (evaluation) {
      statusRef.current?.focus();
    }
  }, [evaluation]);

  // After a retry the student should land on the first control of a fresh exercise. That has to wait
  // until the verdict has really cleared: the view is enabled only then (a disabled control cannot take
  // focus), and the parent may clear it a render after the click — a mutation's reset() does. So the
  // request is remembered and honoured by the first render in which the view is usable.
  useEffect(() => {
    if (focusAfterRetry.current && evaluation === undefined) {
      viewRef.current?.querySelector<HTMLElement>("input:not([disabled])")?.focus();
      focusAfterRetry.current = false;
    }
  }, [evaluation, attempt]);

  function handleRetry() {
    focusAfterRetry.current = true;
    setAttempt((count) => count + 1);
    onRetry();
  }

  const heading =
    position !== null && total !== null
      ? `Exercise ${String(position)} of ${String(total)}`
      : "Exercise";
  const last = exercise.result;
  const showsLastAttempt = last.status !== "unanswered" && !evaluation;
  const backIsTheWayOn = evaluation !== undefined && nextHref === null;

  return (
    <div>
      <header>
        <h1 className="text-2xl font-semibold">{heading}</h1>
        <p className="mt-1 text-sm text-primary/70 dark:text-surface/70">
          {exerciseTypeLabel(exercise.type)}
        </p>
        {showsLastAttempt ? (
          <p className="mt-2 text-sm">
            Your last attempt was {last.status === "correct" ? "correct" : "not correct"} (
            {last.attemptCount} {last.attemptCount === 1 ? "attempt" : "attempts"} so far).
          </p>
        ) : null}
      </header>

      <div ref={viewRef} className="mt-6">
        <ExerciseRenderer
          key={attempt}
          exercise={exercise}
          language={language}
          disabled={isSubmitting || evaluation !== undefined}
          onSubmit={onSubmit}
        />
      </div>

      <ExerciseResult
        evaluation={evaluation}
        correctAnswerText={
          evaluation ? describeCorrectAnswer(exercise, evaluation.correctAnswer) : null
        }
        instructionLanguage={exercise.instructionLanguage}
        learningLanguage={language}
        isChecking={isSubmitting}
        failed={submitFailed}
        statusRef={statusRef}
      />

      {evaluation ? (
        <div className="mt-4">
          {lessonFinished ? (
            <p className="mb-3 font-medium">You have answered every exercise in this lesson.</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={handleRetry}>
              Try again
            </Button>
            {nextHref ? (
              <Link to={nextHref} className={PRIMARY_LINK}>
                Next exercise
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="mt-6">
        <Link to={lessonHref} className={backIsTheWayOn ? PRIMARY_LINK : PLAIN_LINK}>
          Back to lesson
        </Link>
      </p>
    </div>
  );
}
