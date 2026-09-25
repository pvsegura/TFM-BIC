import { CONTENT_STATUSES, isValidContentId } from "@tfm-bic/domain";
import { z } from "zod";

import { plainText } from "../content/content-block.schema.js";
import {
  languageIdSchema,
  levelIdSchema,
  videoDefinitionIdSchema,
} from "../content/identifiers.schema.js";
import { CONTENT_SCHEMA_VERSION } from "../content/language-file.schema.js";

/**
 * An id-shaped reference to another content item (a lesson, a vocabulary entry, a phonetic
 * representation) that a video is anchored to. Deliberately loose — not resolved against those
 * catalogs in this milestone (see `video-catalog.ts`'s doc comment) — but still restricted to the
 * same safe slug shape every content id uses, so it can never carry a path, markup or SQL.
 */
const relatedContentIdSchema = z
  .string()
  .refine(isValidContentId, { error: "Expected a lowercase slug such as pl-ipa-onasal." });

/**
 * A video's render project folder name under `content/video-scripts/` — never a path with
 * separators, so it can only ever name a single sibling folder.
 */
const scriptPathSchema = z.string().refine(isValidContentId, {
  error: "Expected a lowercase slug such as pl-a1-nasal-vowels-demo.",
});

/**
 * One video definition file: `content/languages/<languageId>/videos/<videoId>.json` — one file
 * per video, the same single-item-per-file shape lesson content uses. It names only what should
 * be generated; the provider-specific render project it points to (`scriptPath`) is never parsed
 * here. Strict — an unlisted key is an error, not ignored.
 */
export const videoFileSchema = z.strictObject({
  schemaVersion: z.literal(CONTENT_SCHEMA_VERSION),
  id: videoDefinitionIdSchema,
  languageId: languageIdSchema,
  levelId: levelIdSchema,
  status: z.enum(CONTENT_STATUSES),
  order: z.number().int().min(1).max(100_000),
  instructionLanguage: languageIdSchema,
  title: plainText(120),
  description: plainText(300),
  relatedContentId: relatedContentIdSchema.optional(),
  scriptPath: scriptPathSchema,
});

export type VideoFile = z.infer<typeof videoFileSchema>;
