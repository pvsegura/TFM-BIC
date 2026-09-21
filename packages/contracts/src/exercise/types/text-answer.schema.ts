import { normalizeTextAnswer } from "@tfm-bic/domain";
import { z } from "zod";

import { plainText } from "../../content/content-block.schema.js";
import { presentedExerciseBaseFields } from "../presented-base.schema.js";

const MAX_ACCEPTED_ANSWERS = 20;

/**
 * A text-answer exercise's configuration: every accepted answer, written out
 * (a variant such as a trailing full stop is accepted only if listed), and
 * whether capitalisation matters (default: it does not). No fuzzy matching, no
 * pattern, no code — the strict object refuses any other key.
 *
 * Two entries that the evaluator would treat as the same answer are a mistake,
 * not an accepted variant, so they are rejected: the comparison used here is the
 * evaluator's own (`normalizeTextAnswer`), which is language-neutral for this
 * purpose.
 */
export const textAnswerConfigurationSchema = z
  .strictObject({
    acceptedAnswers: z.array(plainText(200)).min(1).max(MAX_ACCEPTED_ANSWERS),
    caseSensitive: z.boolean().default(false),
  })
  .check((context) => {
    const { acceptedAnswers, caseSensitive } = context.value;
    const seen = new Set<string>();

    acceptedAnswers.forEach((answer, index) => {
      const comparable = normalizeTextAnswer(answer, { caseSensitive, locale: "und" });
      if (seen.has(comparable)) {
        context.issues.push({
          code: "custom",
          message: "This accepted answer repeats another one.",
          input: context.value,
          path: ["acceptedAnswers", index],
        });
      }
      seen.add(comparable);
    });
  });

/** A text-answer exercise as shown before answering: only its prompt — never the accepted answers or settings. */
export const textAnswerPresentedSchema = z.object({
  ...presentedExerciseBaseFields,
  type: z.literal("text-answer"),
});
