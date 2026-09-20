import { CONTENT_STATUSES, CONTENT_TYPES } from "@tfm-bic/domain";
import { z } from "zod";

import { contentBlockSchema, MAX_BLOCKS_PER_ITEM, plainText } from "./content-block.schema.js";
import { contentIdSchema, languageIdSchema, levelIdSchema } from "./identifiers.schema.js";
import { CONTENT_SCHEMA_VERSION } from "./language-file.schema.js";

/**
 * One content item file under
 * `content/languages/<languageId>/levels/<levelId>/content/`. Strict: any key
 * not listed is an error. The file names its own language and level (the
 * loader checks they match its location), so it stays self-describing when it
 * moves to a database or CMS.
 */
export const contentFileSchema = z.strictObject({
  schemaVersion: z.literal(CONTENT_SCHEMA_VERSION),
  id: contentIdSchema,
  languageId: languageIdSchema,
  levelId: levelIdSchema,
  type: z.enum(CONTENT_TYPES),
  status: z.enum(CONTENT_STATUSES),
  order: z.number().int().min(1).max(100_000),
  instructionLanguage: languageIdSchema,
  title: plainText(120),
  description: plainText(300),
  blocks: z.array(contentBlockSchema).min(1).max(MAX_BLOCKS_PER_ITEM),
});

export type ContentFile = z.infer<typeof contentFileSchema>;
