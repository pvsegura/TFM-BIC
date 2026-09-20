import { CONTENT_TYPES, LEVEL_STATUSES, TEXT_DIRECTIONS } from "@tfm-bic/domain";
import { z } from "zod";

import { contentBlockSchema } from "./content-block.schema.js";
import { contentIdSchema, languageIdSchema, levelIdSchema } from "./identifiers.schema.js";

/**
 * Public, student-facing discovery shapes. These are allowlists (Zod strips
 * unknown keys): internal metadata such as `status`, `isActive`, file paths or
 * schema versions can never be serialized, even if a use case result carried
 * it. They are generic — one shape for every language and level.
 */
export const languageResponseSchema = z.object({
  code: languageIdSchema,
  name: z.string(),
  nativeName: z.string(),
  locale: z.string(),
  direction: z.enum(TEXT_DIRECTIONS),
});
export type LanguageResponse = z.infer<typeof languageResponseSchema>;

export const languagesResponseSchema = z.object({ languages: z.array(languageResponseSchema) });
export type LanguagesResponse = z.infer<typeof languagesResponseSchema>;

export const levelResponseSchema = z.object({
  id: levelIdSchema,
  label: z.string(),
  status: z.enum(LEVEL_STATUSES),
});
export type LevelResponse = z.infer<typeof levelResponseSchema>;

export const languageLevelsResponseSchema = z.object({
  language: languageResponseSchema,
  levels: z.array(levelResponseSchema),
});
export type LanguageLevelsResponse = z.infer<typeof languageLevelsResponseSchema>;

export const contentSummaryResponseSchema = z.object({
  id: contentIdSchema,
  languageId: languageIdSchema,
  levelId: levelIdSchema,
  type: z.enum(CONTENT_TYPES),
  title: z.string(),
  description: z.string(),
  order: z.number().int(),
  instructionLanguage: languageIdSchema,
});
export type ContentSummaryResponse = z.infer<typeof contentSummaryResponseSchema>;

export const contentListResponseSchema = z.object({ items: z.array(contentSummaryResponseSchema) });
export type ContentListResponse = z.infer<typeof contentListResponseSchema>;

export const contentResponseSchema = contentSummaryResponseSchema.extend({
  blocks: z.array(contentBlockSchema),
});
export type ContentResponse = z.infer<typeof contentResponseSchema>;

/** Every catalog error body is just a safe, generic message. */
export const catalogErrorResponseSchema = z.object({ error: z.string() });
export type CatalogErrorResponse = z.infer<typeof catalogErrorResponseSchema>;

/** `GET /content?language=pl&level=a1`. Unrelated query parameters (tracking
 * params, cache busters) are ignored; a repeated parameter (an array) is not a
 * string and is rejected. */
export const contentListQuerySchema = z.object({
  language: languageIdSchema,
  level: levelIdSchema,
});
export type ContentListQuery = z.infer<typeof contentListQuerySchema>;

export const languageCodeParamSchema = z.object({ languageCode: languageIdSchema });
export const contentIdParamSchema = z.object({ contentId: contentIdSchema });
