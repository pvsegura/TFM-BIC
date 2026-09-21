import { z } from "zod";

import {
  contentIdSchema,
  exerciseIdSchema,
  languageIdSchema,
  levelIdSchema,
} from "../content/identifiers.schema.js";

/**
 * What every exercise shows before it is answered: identity, position and
 * prompt. These are *allowlisting* schemas (plain `z.object`, which drops keys it
 * does not name), so even if a use case result carried an explanation, a status
 * or part of a configuration, none of it can be serialised.
 */
export const presentedExerciseBaseFields = {
  id: exerciseIdSchema,
  lessonId: contentIdSchema,
  languageId: languageIdSchema,
  levelId: levelIdSchema,
  order: z.number().int(),
  instructionLanguage: languageIdSchema,
  prompt: z.string(),
};
