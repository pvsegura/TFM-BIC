import { CONTENT_STATUSES, GRAMMATICAL_GENDERS, PARTS_OF_SPEECH } from "@tfm-bic/domain";
import { z } from "zod";

import { plainText } from "../content/content-block.schema.js";
import {
  languageIdSchema,
  levelIdSchema,
  vocabularyCategoryIdSchema,
  vocabularyItemIdSchema,
} from "../content/identifiers.schema.js";
import { CONTENT_SCHEMA_VERSION } from "../content/language-file.schema.js";

/** The most entries one category file may hold. A hard cap, so one mistake cannot make a file unreadably large. */
export const MAX_VOCABULARY_ITEMS_PER_FILE = 500;

const exampleSchema = z.strictObject({
  text: plainText(200),
  translation: plainText(200),
});

/**
 * One entry inside a category file. It names only what is its own: the language, the category and
 * the language of the meanings are inherited from the file that holds it, so an entry can never
 * disagree with its category about them. Strict — an unlisted key (a `correct`, a `userId`, an
 * `audioUrl`) is an error, not ignored — and every optional field may simply be left out.
 */
const vocabularyItemFileSchema = z.strictObject({
  id: vocabularyItemIdSchema,
  status: z.enum(CONTENT_STATUSES),
  order: z.number().int().min(1).max(100_000),
  lemma: plainText(80),
  translation: plainText(120),
  levelId: levelIdSchema.optional(),
  partOfSpeech: z.enum(PARTS_OF_SPEECH).optional(),
  gender: z.enum(GRAMMATICAL_GENDERS).optional(),
  plural: plainText(80).optional(),
  note: plainText(200).optional(),
  example: exampleSchema.optional(),
});

/**
 * One vocabulary category and its entries: `content/languages/<languageId>/vocabulary/<categoryId>.json`
 * (the file name is the category id). One file per category keeps an entry's category true by
 * construction and keeps a category reviewable as a unit; adding a language's vocabulary is adding
 * files here, never changing code. Strict, like every content file.
 */
export const vocabularyFileSchema = z.strictObject({
  schemaVersion: z.literal(CONTENT_SCHEMA_VERSION),
  id: vocabularyCategoryIdSchema,
  languageId: languageIdSchema,
  status: z.enum(CONTENT_STATUSES),
  order: z.number().int().min(1).max(100_000),
  instructionLanguage: languageIdSchema,
  title: plainText(80),
  description: plainText(300).optional(),
  items: z.array(vocabularyItemFileSchema).min(1).max(MAX_VOCABULARY_ITEMS_PER_FILE),
});

export type VocabularyFile = z.infer<typeof vocabularyFileSchema>;
