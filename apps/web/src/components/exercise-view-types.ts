import type { ExerciseAnswerRequest, ExerciseResponse } from "@tfm-bic/contracts";

import type { LearningLanguage } from "./content-blocks.js";

/** The answer a view hands back: an option id, typed text or a boolean — the same shape the API accepts. */
export type SubmittedAnswer = ExerciseAnswerRequest["answer"];

/**
 * What every exercise type's view is given. A view only collects an answer: it
 * knows nothing about correctness (it is never handed the answer key, which the
 * API does not send before an answer) and never decides a verdict — it calls
 * `onSubmit` with what the student chose or typed and the server judges it.
 */
export interface ExerciseViewProps<TExercise extends ExerciseResponse> {
  exercise: TExercise;
  /** Locale and direction of the language being learned, from the catalog; the browser decides when unknown. */
  language: LearningLanguage | undefined;
  /** True while a submission is in flight or a verdict is showing: the controls are read-only. */
  disabled: boolean;
  /** Move focus to the first control when the view mounts — used when the student retries. */
  autoFocus: boolean;
  onSubmit: (answer: SubmittedAnswer) => void;
}

/** One exercise type's part of the interface: how to collect an answer and how to say its correct answer in words. */
export interface ExerciseViewDefinition<TExercise extends ExerciseResponse> {
  /** A short name for the kind of exercise, shown in lists and headings. */
  typeLabel: string;
  View: (props: ExerciseViewProps<TExercise>) => React.JSX.Element;
  /** The correct answer as text a student can read, or `null` when it cannot be described. */
  describeAnswer: (exercise: TExercise, answer: SubmittedAnswer) => string | null;
}
