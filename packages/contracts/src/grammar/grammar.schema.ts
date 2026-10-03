import {
  CONTENT_STATUSES,
  GRAMMAR_CATEGORIES,
  createGrammarTopicId,
  isValidGrammarTopicId,
} from "@tfm-bic/domain";
import { z } from "zod";

import { plainText } from "../content/content-block.schema.js";
import { languageIdSchema, levelIdSchema } from "../content/identifiers.schema.js";
import { CONTENT_SCHEMA_VERSION } from "../content/language-file.schema.js";

/** A grammar topic's permanent id — a language-prefixed slug such as `pl-ref-personal-pronouns`. */
export const grammarTopicIdSchema = z
  .string()
  .refine(isValidGrammarTopicId, { error: "Expected a lowercase slug such as pl-ref-pronouns." })
  .transform(createGrammarTopicId);

const tableCell = plainText(120);

const grammarTableSchema = z
  .strictObject({
    caption: plainText(200).optional(),
    columns: z.array(tableCell).min(1).max(10),
    rows: z.array(z.array(tableCell).min(1).max(10)).min(1).max(60),
  })
  .refine((table) => table.rows.every((row) => row.length === table.columns.length), {
    error: "Every table row must have exactly one cell per column.",
  });

const grammarExampleSchema = z.strictObject({
  text: plainText(200),
  translation: plainText(200),
  note: plainText(300).optional(),
});

const grammarSectionSchema = z
  .strictObject({
    heading: plainText(120).optional(),
    text: plainText(1000).optional(),
    table: grammarTableSchema.optional(),
    examples: z.array(grammarExampleSchema).min(1).max(20).optional(),
  })
  .refine((s) => s.text !== undefined || s.table !== undefined || s.examples !== undefined, {
    error: "A section needs a text, a table or examples.",
  });

/**
 * One grammar reference topic: `content/languages/<languageId>/grammar/<topicId>.json` (the file
 * name is the topic id). Strict, like every content file: an unlisted key is an error.
 */
export const grammarFileSchema = z.strictObject({
  schemaVersion: z.literal(CONTENT_SCHEMA_VERSION),
  id: grammarTopicIdSchema,
  languageId: languageIdSchema,
  status: z.enum(CONTENT_STATUSES),
  order: z.number().int().min(1).max(100_000),
  category: z.enum(GRAMMAR_CATEGORIES),
  levelId: levelIdSchema.optional(),
  instructionLanguage: languageIdSchema,
  title: plainText(120),
  description: plainText(300),
  sections: z.array(grammarSectionSchema).min(1).max(30),
});
export type GrammarFile = z.infer<typeof grammarFileSchema>;

// --- API -----------------------------------------------------------------------------------

export const grammarListQuerySchema = z.strictObject({ language: languageIdSchema });

export const grammarTopicParamSchema = z.strictObject({ topicId: grammarTopicIdSchema });

/** One topic in the list: enough to find it, not its tables. An allowlist: no status, no order. */
export const grammarTopicSummaryResponseSchema = z.object({
  id: z.string(),
  languageId: z.string(),
  category: z.enum(GRAMMAR_CATEGORIES),
  levelId: z.string().optional(),
  title: z.string(),
  description: z.string(),
});
export type GrammarTopicSummaryResponse = z.infer<typeof grammarTopicSummaryResponseSchema>;

export const grammarListResponseSchema = z.object({
  topics: z.array(grammarTopicSummaryResponseSchema),
});
export type GrammarListResponse = z.infer<typeof grammarListResponseSchema>;

export const grammarTopicResponseSchema = grammarTopicSummaryResponseSchema.extend({
  instructionLanguage: z.string(),
  sections: z.array(
    z.object({
      heading: z.string().optional(),
      text: z.string().optional(),
      table: z
        .object({
          caption: z.string().optional(),
          columns: z.array(z.string()),
          rows: z.array(z.array(z.string())),
        })
        .optional(),
      examples: z
        .array(z.object({ text: z.string(), translation: z.string(), note: z.string().optional() }))
        .optional(),
    }),
  ),
});
export type GrammarTopicResponse = z.infer<typeof grammarTopicResponseSchema>;
