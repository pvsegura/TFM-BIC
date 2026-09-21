import { CONTENT_STATUSES, type ExerciseType } from "@tfm-bic/domain";
import { z } from "zod";

import { plainText } from "../content/content-block.schema.js";
import {
  contentIdSchema,
  exerciseIdSchema,
  languageIdSchema,
  levelIdSchema,
} from "../content/identifiers.schema.js";
import { CONTENT_SCHEMA_VERSION } from "../content/language-file.schema.js";
import { multipleChoiceConfigurationSchema } from "./types/multiple-choice.schema.js";
import { textAnswerConfigurationSchema } from "./types/text-answer.schema.js";
import { trueFalseConfigurationSchema } from "./types/true-false.schema.js";

/** What every exercise file has, whatever its type. */
const commonFields = {
  schemaVersion: z.literal(CONTENT_SCHEMA_VERSION),
  id: exerciseIdSchema,
  lessonId: contentIdSchema,
  languageId: languageIdSchema,
  levelId: levelIdSchema,
  status: z.enum(CONTENT_STATUSES),
  order: z.number().int().min(1).max(100_000),
  instructionLanguage: languageIdSchema,
  prompt: plainText(300),
  explanation: plainText(500).optional(),
};

/** One exercise type's file: the common fields, its `type` and its own configuration schema. */
function exerciseFileOf<TType extends ExerciseType, TConfiguration extends z.ZodType>(
  type: TType,
  configuration: TConfiguration,
) {
  return z.strictObject({ ...commonFields, type: z.literal(type), configuration });
}

/**
 * One exercise file under
 * `content/languages/<languageId>/levels/<levelId>/exercises/`. Strict: any key
 * not listed is an error, so a file cannot carry a `correct`, `score` or `userId`
 * field, executable content or anything a later layer might trust by mistake.
 *
 * The union is discriminated on `type`, and each type's `configuration` is
 * validated by that type's own schema (`types/`). A type this list does not name
 * is invalid — the content cannot introduce one. Adding a type means adding its
 * schema file and one line here.
 */
export const exerciseFileSchema = z.discriminatedUnion("type", [
  exerciseFileOf("multiple-choice", multipleChoiceConfigurationSchema),
  exerciseFileOf("text-answer", textAnswerConfigurationSchema),
  exerciseFileOf("true-false", trueFalseConfigurationSchema),
]);

export type ExerciseFile = z.infer<typeof exerciseFileSchema>;
