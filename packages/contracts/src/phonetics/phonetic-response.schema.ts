import { PHONETIC_PROGRESS_VIEW_STATUSES } from "@tfm-bic/domain";
import { z } from "zod";

import { wholeNumberText } from "../common/whole-number-text.js";
import {
  languageIdSchema,
  levelIdSchema,
  phoneticRepresentationIdSchema,
  phoneticTopicIdSchema,
} from "../content/identifiers.schema.js";

/**
 * Student-facing phonetics shapes (M10). Response schemas are allowlists — Zod drops any key not
 * named, so a user id, a `status` of the content lifecycle or a file path can never be serialised
 * even if a use case result carried one — and they are generic: one shape for every language. A
 * representation (content) and a student's progress on it are separate objects that are only
 * joined here, at the edge, for one authenticated student. Request schemas are strict: a key that
 * is not documented is an error, never ignored.
 */

const isoTimestamp = z.iso.datetime();
const count = z.number().int().min(0);

/** A student's own progress on a representation: `not_started` (nothing done, all times `null`) or one of the stored statuses. */
export const phoneticUserProgressResponseSchema = z.object({
  status: z.enum(PHONETIC_PROGRESS_VIEW_STATUSES),
  firstViewedAt: isoTimestamp.nullable(),
  lastViewedAt: isoTimestamp.nullable(),
  /** Set once `status` has reached `practiced` or `completed`, `null` while only `viewed`. */
  practicedAt: isoTimestamp.nullable(),
  /** Set if and only if `status` is `completed`. */
  completedAt: isoTimestamp.nullable(),
});
export type PhoneticUserProgressResponse = z.infer<typeof phoneticUserProgressResponseSchema>;

/**
 * One representation as a student sees it. Optional fields are left out when the representation
 * does not have them (never sent empty), so the interface shows what exists and nothing else.
 * `topic` carries the title so a card needs no second request.
 */
export const phoneticRepresentationResponseSchema = z.object({
  id: phoneticRepresentationIdSchema,
  languageId: languageIdSchema,
  topic: z.object({ id: phoneticTopicIdSchema, title: z.string() }).optional(),
  ipa: z.string().min(1),
  description: z.string(),
  instructionLanguage: languageIdSchema,
  levelId: levelIdSchema.optional(),
  note: z.string().optional(),
  exampleWords: z.array(z.object({ word: z.string(), translation: z.string() })).optional(),
  userProgress: phoneticUserProgressResponseSchema,
});
export type PhoneticRepresentationResponse = z.infer<typeof phoneticRepresentationResponseSchema>;

export const phoneticListResponseSchema = z.object({
  items: z.array(phoneticRepresentationResponseSchema),
  /** How many representations match the filters in all, not just on this page. */
  total: count,
  /** Pass as `after` to get the next page; `null` when this was the last one. */
  nextAfter: phoneticRepresentationIdSchema.nullable(),
});
export type PhoneticListResponse = z.infer<typeof phoneticListResponseSchema>;

/** How many representations there are and how many the student has in each stored status (`not_started` is the rest). */
export const phoneticTopicProgressResponseSchema = z.object({
  representationCount: count,
  viewed: count,
  practiced: count,
  completed: count,
});
export type PhoneticTopicProgressResponse = z.infer<typeof phoneticTopicProgressResponseSchema>;

export const phoneticTopicResponseSchema = z.object({
  id: phoneticTopicIdSchema,
  languageId: languageIdSchema,
  title: z.string(),
  description: z.string().optional(),
  instructionLanguage: languageIdSchema,
  progress: phoneticTopicProgressResponseSchema,
});
export type PhoneticTopicResponse = z.infer<typeof phoneticTopicResponseSchema>;

/** A language's topics in order, each with the student's progress. */
export const phoneticTopicsResponseSchema = z.object({
  topics: z.array(phoneticTopicResponseSchema),
});
export type PhoneticTopicsResponse = z.infer<typeof phoneticTopicsResponseSchema>;

const DEFAULT_PHONETIC_PAGE_SIZE = 20;
export const MAX_PHONETIC_PAGE_SIZE = 50;

/**
 * `GET /phonetics?language=&level=&topic=&status=&limit=&after=` — the representations of one
 * language, in curriculum order, one page at a time (keyset paging: `after` is the last id of the
 * previous page, like vocabulary's cursor). `status` filters by the student's own progress,
 * `not_started` included. A repeated parameter, a value that does not validate and any parameter
 * not listed — a `userId`, say — is rejected rather than ignored.
 */
export const phoneticListQuerySchema = z.strictObject({
  language: languageIdSchema,
  level: levelIdSchema.optional(),
  topic: phoneticTopicIdSchema.optional(),
  status: z.enum(PHONETIC_PROGRESS_VIEW_STATUSES).optional(),
  limit: wholeNumberText
    .transform(Number)
    .pipe(z.number().max(MAX_PHONETIC_PAGE_SIZE))
    .default(DEFAULT_PHONETIC_PAGE_SIZE),
  /** The id of the last representation of the previous page. */
  after: phoneticRepresentationIdSchema.optional(),
});
export type PhoneticListQuery = z.infer<typeof phoneticListQuerySchema>;

/** `GET /phonetics/topics?language=` */
export const phoneticTopicsQuerySchema = z.strictObject({ language: languageIdSchema });
export type PhoneticTopicsQuery = z.infer<typeof phoneticTopicsQuerySchema>;

/** A representation is addressed by its permanent id, so the same strict pattern applies: nothing here can carry a path, markup or SQL. */
export const phoneticIdParamSchema = z.object({ phoneticId: phoneticRepresentationIdSchema });

/**
 * `POST /phonetics/:id/view`, `/practice` and `/complete` take no input at all: the user comes
 * from the session, the representation from the URL, and the time and the resulting progress from
 * the server. Any key in a body is rejected rather than silently ignored, so a client can never
 * believe it set one. No body is the normal case.
 */
export const phoneticActionRequestSchema = z.strictObject({}).optional();
