import {
  countWords,
  GAP_MARKER,
  MAX_GAPS,
  MAX_MATCHING_PAIRS,
  MAX_ORDERING_ITEMS,
  MIN_MATCHING_PAIRS,
  MIN_ORDERING_ITEMS,
} from "@verbysia/domain";
import { z } from "zod";

import { plainText } from "../../content/content-block.schema.js";
import { presentedExerciseBaseFields } from "../presented-base.schema.js";

/**
 * The exercise types added for the workbooks (ordering, matching, gap-fill, open writing). Each
 * works the same on screen and on paper; the configuration is validated here, when the content
 * files are loaded, so a broken exercise never reaches a learner or a printed page.
 */

function noDuplicates(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

export const orderingConfigurationSchema = z
  .strictObject({
    items: z.array(plainText(200)).min(MIN_ORDERING_ITEMS).max(MAX_ORDERING_ITEMS),
    joiner: z.enum([" ", " / ", ", "]).default(" "),
  })
  .refine((config) => noDuplicates(config.items), {
    error: "Items must be different from each other (otherwise two orders would be right).",
  });

export const matchingConfigurationSchema = z
  .strictObject({
    pairs: z
      .array(z.strictObject({ left: plainText(150), right: plainText(150) }))
      .min(MIN_MATCHING_PAIRS)
      .max(MAX_MATCHING_PAIRS),
  })
  .refine(
    (config) =>
      noDuplicates(config.pairs.map((p) => p.left)) &&
      noDuplicates(config.pairs.map((p) => p.right)),
    { error: "Left items and right items must each be unique." },
  );

export const gapFillConfigurationSchema = z
  .strictObject({
    text: plainText(600),
    gaps: z
      .array(z.strictObject({ accepted: z.array(plainText(100)).min(1).max(10) }))
      .min(1)
      .max(MAX_GAPS),
    caseSensitive: z.boolean().default(false),
  })
  .refine((config) => config.text.split(GAP_MARKER).length === config.gaps.length + 1, {
    error: `The text must contain exactly one ${GAP_MARKER} per gap.`,
  });

export const openWritingConfigurationSchema = z
  .strictObject({
    modelAnswer: plainText(1500),
    checklist: z.array(plainText(200)).min(1).max(8),
    minWords: z.number().int().min(1).max(400),
    maxWords: z.number().int().min(1).max(400),
  })
  .refine((config) => config.minWords <= config.maxWords, {
    error: "minWords must not exceed maxWords.",
  })
  .refine(
    (config) => {
      const words = countWords(config.modelAnswer);
      return words >= config.minWords && words <= config.maxWords;
    },
    { error: "The model answer must itself respect the word limits." },
  );

export const orderingPresentedSchema = z.object({
  ...presentedExerciseBaseFields,
  type: z.literal("ordering"),
  items: z.array(z.string()),
  joiner: z.string(),
});

export const matchingPresentedSchema = z.object({
  ...presentedExerciseBaseFields,
  type: z.literal("matching"),
  left: z.array(z.string()),
  right: z.array(z.string()),
});

export const gapFillPresentedSchema = z.object({
  ...presentedExerciseBaseFields,
  type: z.literal("gap-fill"),
  segments: z.array(z.string()),
});

export const openWritingPresentedSchema = z.object({
  ...presentedExerciseBaseFields,
  type: z.literal("open-writing"),
  checklist: z.array(z.string()),
  minWords: z.number().int(),
  maxWords: z.number().int(),
});
