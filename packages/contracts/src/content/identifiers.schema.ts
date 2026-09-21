import {
  createContentId,
  createExerciseId,
  createLanguageId,
  isValidContentId,
  isValidExerciseId,
  isValidLanguageId,
  LEVEL_IDS,
} from "@tfm-bic/domain";
import { z } from "zod";

/**
 * Identifier schemas built on the domain's own predicates and constructors, so
 * the file format, the API and the domain can never disagree about what a
 * valid id is. Each one outputs the branded domain type.
 */
export const languageIdSchema = z
  .string()
  .refine(isValidLanguageId, { error: "Expected a lowercase ISO 639 language code such as pl." })
  .transform(createLanguageId);

export const levelIdSchema = z.enum(LEVEL_IDS, { error: "Expected a CEFR level id (a1 to c2)." });

export const contentIdSchema = z
  .string()
  .refine(isValidContentId, { error: "Expected a lowercase slug such as pl-greetings." })
  .transform(createContentId);

/** An exercise's permanent id — the same strict slug rules as a content id, as its own branded type. */
export const exerciseIdSchema = z
  .string()
  .refine(isValidExerciseId, { error: "Expected a lowercase slug such as pl-greetings-hello." })
  .transform(createExerciseId);
