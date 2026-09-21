import {
  ExerciseNotFoundError,
  InvalidExerciseAnswerError,
  UnsupportedExerciseTypeError,
} from "@tfm-bic/domain";

import type { MappedCatalogError } from "./catalog-error.mapper.js";
import { mapLessonError } from "./lesson-error.mapper.js";

/**
 * Translates the domain errors the exercise use cases throw into a safe HTTP
 * response: a fixed message, never the requested id or the submitted answer (see
 * docs/security/security-baseline.md).
 *
 * - Every reason an exercise is not available — missing, draft, archived, its
 *   lesson hidden or not a lesson — is the same 404, so a caller cannot probe for
 *   unpublished content.
 * - An answer that is not a well-formed answer to the exercise is a 400 with its
 *   own fixed message, so the client can tell "you sent something invalid" from
 *   "there is no such exercise".
 * - An exercise type with no registered evaluator is a 501: a server-side gap the
 *   student cannot fix, and not something to describe further.
 *
 * The lesson outcomes (and the language/level ones behind them) are the lesson
 * mapper's. An error not recognised anywhere — including an exercise whose
 * stored configuration is broken — is rethrown for Fastify's central handler
 * (generic 500, logged), never guessed at, so no evaluator internals or answer
 * key can leak through an error body.
 */
export function mapExerciseError(error: unknown): MappedCatalogError {
  if (error instanceof ExerciseNotFoundError) {
    return { statusCode: 404, body: { error: "Exercise not found." } };
  }
  if (error instanceof InvalidExerciseAnswerError) {
    return { statusCode: 400, body: { error: "Invalid answer." } };
  }
  if (error instanceof UnsupportedExerciseTypeError) {
    return { statusCode: 501, body: { error: "This kind of exercise is not supported." } };
  }
  return mapLessonError(error);
}
