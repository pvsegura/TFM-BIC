import type { MultipleChoiceExercise, PresentedMultipleChoice } from "./types/multiple-choice.js";
import type { PresentedTextAnswer, TextAnswerExercise } from "./types/text-answer.js";
import type { PresentedTrueFalse, TrueFalseExercise } from "./types/true-false.js";

/**
 * Any exercise: a discriminated union on `type`, one member per exercise type.
 * Adding a type adds one member here (and one to `PresentedExercise`); code that
 * handles a single type never sees the others, and there is no chain of
 * `if (type === …)` — dispatch goes through the registry.
 */
export type Exercise = MultipleChoiceExercise | TextAnswerExercise | TrueFalseExercise;

/** An exercise as a student may see it *before* answering: never the answer key. */
export type PresentedExercise = PresentedMultipleChoice | PresentedTextAnswer | PresentedTrueFalse;
