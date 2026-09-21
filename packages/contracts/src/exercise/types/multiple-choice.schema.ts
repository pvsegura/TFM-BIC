import { isValidOptionId, MAX_OPTIONS, MIN_OPTIONS } from "@tfm-bic/domain";
import { z } from "zod";

import { plainText } from "../../content/content-block.schema.js";
import { presentedExerciseBaseFields } from "../presented-base.schema.js";

/** An option's stable id (`a`, `opt-2`): the domain's own predicate, so the file format and the evaluator agree. */
export const optionIdSchema = z
  .string()
  .refine(isValidOptionId, { error: "Expected a short lowercase slug such as opt-a." });

const optionSchema = z.strictObject({ id: optionIdSchema, text: plainText(200) });

/**
 * A multiple-choice exercise's configuration: the options and *exactly one*
 * correct option, named by its id. There is no per-option "correct" flag and no
 * list of correct ids, so "two correct options" cannot be written down — an
 * unknown key is an error. Ids and texts must be unique, and the correct id must
 * be one of the options.
 */
export const multipleChoiceConfigurationSchema = z
  .strictObject({
    options: z.array(optionSchema).min(MIN_OPTIONS).max(MAX_OPTIONS),
    correctOptionId: optionIdSchema,
  })
  .check((context) => {
    const { options, correctOptionId } = context.value;
    const ids = new Set<string>();
    const texts = new Set<string>();

    options.forEach((option, index) => {
      if (ids.has(option.id)) {
        context.issues.push({
          code: "custom",
          message: `Option id "${option.id}" is used more than once.`,
          input: context.value,
          path: ["options", index, "id"],
        });
      }
      if (texts.has(option.text)) {
        context.issues.push({
          code: "custom",
          message: "Two options have the same text.",
          input: context.value,
          path: ["options", index, "text"],
        });
      }
      ids.add(option.id);
      texts.add(option.text);
    });

    if (!ids.has(correctOptionId)) {
      context.issues.push({
        code: "custom",
        message: "correctOptionId must be the id of one of the options.",
        input: context.value,
        path: ["correctOptionId"],
      });
    }
  });

/** A multiple-choice exercise as shown before answering: the options (id and text only) — never which one is correct. */
export const multipleChoicePresentedSchema = z.object({
  ...presentedExerciseBaseFields,
  type: z.literal("multiple-choice"),
  options: z.array(z.object({ id: optionIdSchema, text: z.string() })),
});
