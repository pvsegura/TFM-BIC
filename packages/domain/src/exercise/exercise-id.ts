import type { Brand } from "@tfm-bic/shared";

import { isValidContentId } from "../content/content-id.js";
import type { LanguageId } from "../language/language-id.js";
import { InvalidExerciseIdError } from "./errors/invalid-exercise-id.error.js";

/**
 * A stable, human-readable identifier for one exercise, for example
 * `pl-greetings-polite-hello`. It is identity, not description: the prompt, the
 * options, the explanation and the exercise's position may all change and the
 * id never does (retire an exercise by `status: archived`, never by renaming),
 * so a student's attempts keep pointing at the same exercise.
 *
 * It follows the content-id rules on purpose — the same strict pattern and
 * length, language-prefixed — so an id is safe in a URL, a file name and a
 * database column, and can never carry path separators, markup or SQL.
 */
export type ExerciseId = Brand<string, "ExerciseId">;

export function isValidExerciseId(value: string): boolean {
  return isValidContentId(value);
}

export function createExerciseId(value: string): ExerciseId {
  if (!isValidExerciseId(value)) {
    throw new InvalidExerciseIdError(value);
  }
  return value as ExerciseId;
}

export function exerciseIdBelongsToLanguage(id: ExerciseId, languageId: LanguageId): boolean {
  return id.startsWith(`${languageId}-`);
}
