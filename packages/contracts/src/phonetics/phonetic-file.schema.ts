import { CONTENT_STATUSES } from "@tfm-bic/domain";
import { z } from "zod";

import { plainText } from "../content/content-block.schema.js";
import {
  languageIdSchema,
  levelIdSchema,
  phoneticRepresentationIdSchema,
  phoneticTopicIdSchema,
} from "../content/identifiers.schema.js";
import { CONTENT_SCHEMA_VERSION } from "../content/language-file.schema.js";

/** The most representations one topic file may hold. A hard cap, so one mistake cannot make a file unreadably large. */
export const MAX_PHONETIC_REPRESENTATIONS_PER_FILE = 500;

const exampleWordSchema = z.strictObject({
  word: plainText(80),
  translation: plainText(120),
});

/**
 * One representation inside a topic file. It names only what is its own: the language, the topic
 * and the language of the description are inherited from the file that holds it, so a
 * representation can never disagree with its own topic about them. Strict — an unlisted key (a
 * `userId`, an `audioUrl`) is an error, not ignored — and every optional field may simply be left
 * out.
 */
const phoneticRepresentationFileSchema = z.strictObject({
  id: phoneticRepresentationIdSchema,
  status: z.enum(CONTENT_STATUSES),
  order: z.number().int().min(1).max(100_000),
  /** The IPA transcription, as Unicode text — bounded, but otherwise unrestricted. */
  ipa: plainText(40),
  description: plainText(300),
  levelId: levelIdSchema.optional(),
  note: plainText(200).optional(),
  exampleWords: z.array(exampleWordSchema).min(1).max(20).optional(),
});

/**
 * One phonetic topic and its representations: `content/languages/<languageId>/phonetics/<topicId>.json`
 * (the file name is the topic id) — the same one-file-per-topic shape `vocabularyFileSchema` uses
 * (ADR-022). Adding a language's phonetics is adding files here, never changing code. Strict, like
 * every content file.
 */
export const phoneticFileSchema = z.strictObject({
  schemaVersion: z.literal(CONTENT_SCHEMA_VERSION),
  id: phoneticTopicIdSchema,
  languageId: languageIdSchema,
  status: z.enum(CONTENT_STATUSES),
  order: z.number().int().min(1).max(100_000),
  instructionLanguage: languageIdSchema,
  title: plainText(80),
  description: plainText(300).optional(),
  items: z
    .array(phoneticRepresentationFileSchema)
    .min(1)
    .max(MAX_PHONETIC_REPRESENTATIONS_PER_FILE),
});

export type PhoneticFile = z.infer<typeof phoneticFileSchema>;
