import { z } from "zod";
import { presentedExerciseBaseFields } from "../presented-base.schema.js";

/** A true/false exercise's configuration: whether its statement (the prompt) is true. A real boolean, never a string. */
export const trueFalseConfigurationSchema = z.strictObject({ correctAnswer: z.boolean() });

/** A true/false exercise as shown before answering: the statement (its prompt) and nothing else. */
export const trueFalsePresentedSchema = z.object({
  ...presentedExerciseBaseFields,
  type: z.literal("true-false"),
});
