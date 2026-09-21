import type { ExerciseResponse } from "@tfm-bic/contracts";
import { createElement, type ReactElement } from "react";

import { MultipleChoiceExerciseView } from "./multiple-choice-exercise-view.js";
import { TextAnswerExerciseView } from "./text-answer-exercise-view.js";
import { TrueFalseExerciseView } from "./true-false-exercise-view.js";
import type {
  ExerciseViewDefinition,
  ExerciseViewProps,
  SubmittedAnswer,
} from "./exercise-view-types.js";

/** One registered view with its exercise type erased, so the registry can hold them all in one map. */
export interface RegisteredView {
  typeLabel: string;
  render: (props: ExerciseViewProps<ExerciseResponse>) => ReactElement | null;
  describeAnswer: (exercise: ExerciseResponse, answer: SubmittedAnswer) => string | null;
}

/**
 * Registers one exercise type's view. The generic types of a single view are
 * erased here, and the only place an `ExerciseResponse` is narrowed back to its
 * own type checks `exercise.type` first — so a view is only ever given the kind of
 * exercise it was written for.
 */
function registerView<TExercise extends ExerciseResponse>(
  type: TExercise["type"],
  definition: ExerciseViewDefinition<TExercise>,
): [string, RegisteredView] {
  const isOwnType = (exercise: ExerciseResponse): exercise is TExercise => exercise.type === type;

  return [
    type,
    {
      typeLabel: definition.typeLabel,
      render: (props) =>
        isOwnType(props.exercise)
          ? createElement(definition.View, { ...props, exercise: props.exercise })
          : null,
      describeAnswer: (exercise, answer) =>
        isOwnType(exercise) ? definition.describeAnswer(exercise, answer) : null,
    },
  ];
}

/**
 * The exercise types this version of the app can show. Only what is registered
 * here can render: the type comes from the API's validated response, never from a
 * URL or from content, and nothing is imported or looked up by that string. Adding
 * a type is a view component plus one entry here (its label, how to say its correct
 * answer, and the view) — no page, list or player changes, and no other type's view
 * is touched. There is no per-language view: language is data the views are handed,
 * not something they branch on.
 */
const VIEWS: ReadonlyMap<string, RegisteredView> = new Map([
  registerView("multiple-choice", {
    typeLabel: "Multiple choice",
    View: MultipleChoiceExerciseView,
    // The correct answer arrives as an option id; the student is shown that option's text.
    describeAnswer: (exercise, answer) =>
      exercise.options.find((option) => option.id === answer)?.text ?? null,
  }),
  registerView("text-answer", {
    typeLabel: "Text answer",
    View: TextAnswerExerciseView,
    describeAnswer: (_exercise, answer) => (typeof answer === "string" ? answer : null),
  }),
  registerView("true-false", {
    typeLabel: "True or false",
    View: TrueFalseExerciseView,
    describeAnswer: (_exercise, answer) =>
      typeof answer === "boolean" ? (answer ? "True" : "False") : null,
  }),
]);

/** The registered view for a type, or `undefined` for a type this version does not know. */
export function viewFor(type: string): RegisteredView | undefined {
  return VIEWS.get(type);
}

/** A short name for a kind of exercise, for lists and headings. */
export function exerciseTypeLabel(type: string): string {
  return VIEWS.get(type)?.typeLabel ?? "Exercise";
}

/**
 * The correct answer, as text a student can read (an option's wording, the typed
 * text, "True"/"False"). It is only ever called with the answer the *server*
 * returned after a submission; `null` when it cannot be described.
 */
export function describeCorrectAnswer(
  exercise: ExerciseResponse,
  answer: SubmittedAnswer,
): string | null {
  return VIEWS.get(exercise.type)?.describeAnswer(exercise, answer) ?? null;
}
