import {
  GRAMMATICAL_GENDERS,
  PARTS_OF_SPEECH,
  STORED_VOCABULARY_STATUSES,
  VOCABULARY_VIEW_STATUSES,
} from "@tfm-bic/domain";
import { z } from "zod";

import { wholeNumberText } from "../common/whole-number-text.js";
import {
  languageIdSchema,
  levelIdSchema,
  vocabularyCategoryIdSchema,
  vocabularyItemIdSchema,
} from "../content/identifiers.schema.js";

/**
 * Student-facing vocabulary shapes (M9). Response schemas are allowlists — Zod drops any key not
 * named, so a user id, a `status` of the content lifecycle or a file path can never be serialised
 * even if a use case result carried one — and they are generic: one shape for every language. An
 * entry (content) and a student's state for it are separate objects that are only joined here, at
 * the edge, for one authenticated student. Request schemas are strict: a key that is not
 * documented is an error, never ignored.
 */

const isoTimestamp = z.iso.datetime();
const count = z.number().int().min(0);

/** A student's own state for a word: `new` (nothing done, all times `null`) or one of the stored statuses. */
export const vocabularyUserStateResponseSchema = z.object({
  status: z.enum(VOCABULARY_VIEW_STATUSES),
  /** When the word first got a record for this student. */
  createdAt: isoTimestamp.nullable(),
  updatedAt: isoTimestamp.nullable(),
  /** Set if and only if `status` is `learned`. */
  learnedAt: isoTimestamp.nullable(),
});
export type VocabularyUserStateResponse = z.infer<typeof vocabularyUserStateResponseSchema>;

/**
 * One entry as a student sees it. Optional fields are left out when the entry does not have them
 * (never sent empty), so the interface shows what exists and nothing else. `category` carries the
 * title so a card needs no second request.
 */
export const vocabularyItemResponseSchema = z.object({
  id: vocabularyItemIdSchema,
  languageId: languageIdSchema,
  category: z.object({ id: vocabularyCategoryIdSchema, title: z.string() }),
  lemma: z.string(),
  translation: z.string(),
  instructionLanguage: languageIdSchema,
  levelId: levelIdSchema.optional(),
  partOfSpeech: z.enum(PARTS_OF_SPEECH).optional(),
  gender: z.enum(GRAMMATICAL_GENDERS).optional(),
  plural: z.string().optional(),
  note: z.string().optional(),
  example: z.object({ text: z.string(), translation: z.string() }).optional(),
  userState: vocabularyUserStateResponseSchema,
});
export type VocabularyItemResponse = z.infer<typeof vocabularyItemResponseSchema>;

export const vocabularyListResponseSchema = z.object({
  items: z.array(vocabularyItemResponseSchema),
  /** How many entries match the filters in all, not just on this page. */
  total: count,
  /** Pass as `after` to get the next page; `null` when this was the last one. */
  nextAfter: vocabularyItemIdSchema.nullable(),
});
export type VocabularyListResponse = z.infer<typeof vocabularyListResponseSchema>;

/** How many entries there are and how many the student has in each stored status (`new` is the rest). */
export const vocabularyProgressResponseSchema = z.object({
  itemCount: count,
  saved: count,
  learning: count,
  learned: count,
});
export type VocabularyProgressResponse = z.infer<typeof vocabularyProgressResponseSchema>;

export const vocabularyCategoryResponseSchema = z.object({
  id: vocabularyCategoryIdSchema,
  languageId: languageIdSchema,
  title: z.string(),
  description: z.string().optional(),
  instructionLanguage: languageIdSchema,
  progress: vocabularyProgressResponseSchema,
});
export type VocabularyCategoryResponse = z.infer<typeof vocabularyCategoryResponseSchema>;

/** A language's categories in order, each with the student's progress, and the language's total. */
export const vocabularyCategoriesResponseSchema = z.object({
  categories: z.array(vocabularyCategoryResponseSchema),
  progress: vocabularyProgressResponseSchema,
});
export type VocabularyCategoriesResponse = z.infer<typeof vocabularyCategoriesResponseSchema>;

const DEFAULT_VOCABULARY_PAGE_SIZE = 20;
export const MAX_VOCABULARY_PAGE_SIZE = 50;
export const MAX_VOCABULARY_SEARCH_LENGTH = 50;

/**
 * The search term: trimmed, 1 to 50 characters, no control characters. Markup is not rejected —
 * the term is only ever compared as text and never echoed back — so a learner may search for any
 * character.
 */
const searchTerm = z
  .string()
  .trim()
  .min(1)
  .max(MAX_VOCABULARY_SEARCH_LENGTH)
  .refine((value) => !/\p{Cc}/u.test(value), { error: "Must not contain control characters." });

/** The filters both listings share. `language` is required: what is shown always depends on a language. */
const listFilters = {
  language: languageIdSchema,
  level: levelIdSchema.optional(),
  category: vocabularyCategoryIdSchema.optional(),
  q: searchTerm.optional(),
  limit: wholeNumberText
    .transform(Number)
    .pipe(z.number().max(MAX_VOCABULARY_PAGE_SIZE))
    .default(DEFAULT_VOCABULARY_PAGE_SIZE),
  /** The id of the last entry of the previous page. */
  after: vocabularyItemIdSchema.optional(),
};

/**
 * `GET /vocabulary?language=&level=&category=&status=&q=&limit=&after=` — the entries of one
 * language, in curriculum order, one page at a time (keyset paging: `after` is the last id of the
 * previous page, like the points history's cursor). `status` filters by the student's own state,
 * `new` included. A repeated parameter, a value that does not validate and any parameter not
 * listed — a `userId`, say — is rejected rather than ignored.
 */
export const vocabularyListQuerySchema = z.strictObject({
  ...listFilters,
  status: z.enum(VOCABULARY_VIEW_STATUSES).optional(),
});
export type VocabularyListQuery = z.infer<typeof vocabularyListQuerySchema>;

/** `GET /user-vocabulary` — the same filters, over the student's own words: `status` is one of the stored ones. */
export const userVocabularyQuerySchema = z.strictObject({
  ...listFilters,
  status: z.enum(STORED_VOCABULARY_STATUSES).optional(),
});
export type UserVocabularyQuery = z.infer<typeof userVocabularyQuerySchema>;

/** `GET /vocabulary/categories?language=` */
export const vocabularyCategoriesQuerySchema = z.strictObject({ language: languageIdSchema });
export type VocabularyCategoriesQuery = z.infer<typeof vocabularyCategoriesQuerySchema>;

/** An entry is addressed by its permanent id, so the same strict pattern applies: nothing here can carry a path, markup or SQL. */
export const vocabularyIdParamSchema = z.object({ vocabularyId: vocabularyItemIdSchema });

/**
 * `PUT /vocabulary/:vocabularyId/status`: the one thing a client chooses is the target status, and
 * only a stored one — `new` is reached by removing the word. Anything else in the body — a
 * `userId`, a time — is rejected.
 */
export const vocabularyStatusRequestSchema = z.strictObject({
  status: z.enum(STORED_VOCABULARY_STATUSES),
});
export type VocabularyStatusRequest = z.infer<typeof vocabularyStatusRequestSchema>;

/**
 * `POST /vocabulary/:id/save`, `DELETE /vocabulary/:id/save` and `POST /vocabulary/:id/learned`
 * take no input at all: the user comes from the session, the word from the URL, and the time and
 * the resulting status from the server. Any key in a body is rejected rather than silently
 * ignored, so a client can never believe it set one. No body is the normal case.
 */
export const vocabularyActionRequestSchema = z.strictObject({}).optional();
