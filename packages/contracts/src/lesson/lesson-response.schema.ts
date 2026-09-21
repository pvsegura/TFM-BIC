import { LESSON_PROGRESS_VIEW_STATUSES } from "@tfm-bic/domain";
import { z } from "zod";

import { contentBlockSchema } from "../content/content-block.schema.js";
import { contentIdSchema, languageIdSchema, levelIdSchema } from "../content/identifiers.schema.js";
import { rewardsResponseSchema } from "../gamification/gamification-response.schema.js";

/**
 * Student-facing lesson shapes (M6). Like the catalog shapes they are
 * allowlists — Zod strips unknown keys, so a user id, `status` or file path can
 * never be serialized even if a use case result carried one — and they are
 * generic: one shape for every language and level. A lesson's content and a
 * student's progress in it are separate objects that are only joined here, at
 * the edge, for one authenticated student.
 */

/** Times cross the wire as ISO 8601 strings, never as client-supplied values. */
const isoTimestamp = z.iso.datetime();

export const lessonProgressResponseSchema = z.object({
  status: z.enum(LESSON_PROGRESS_VIEW_STATUSES),
  startedAt: isoTimestamp.nullable(),
  completedAt: isoTimestamp.nullable(),
});
export type LessonProgressResponse = z.infer<typeof lessonProgressResponseSchema>;

/**
 * The answer to `POST /lessons/:lessonId/complete` (M8): the progress the lesson now has, plus
 * what completing it earned. `start` and every read keep returning the bare progress — only a
 * completion can earn anything.
 */
export const lessonCompletionResponseSchema = lessonProgressResponseSchema.extend({
  rewards: rewardsResponseSchema,
});
export type LessonCompletionResponse = z.infer<typeof lessonCompletionResponseSchema>;

/** What a lesson card needs: list metadata and this student's progress, no body. */
export const lessonSummaryResponseSchema = z.object({
  id: contentIdSchema,
  languageId: languageIdSchema,
  levelId: levelIdSchema,
  title: z.string(),
  description: z.string(),
  order: z.number().int(),
  instructionLanguage: languageIdSchema,
  progress: lessonProgressResponseSchema,
});
export type LessonSummaryResponse = z.infer<typeof lessonSummaryResponseSchema>;

export const lessonListResponseSchema = z.object({ lessons: z.array(lessonSummaryResponseSchema) });
export type LessonListResponse = z.infer<typeof lessonListResponseSchema>;

/** One lesson with everything the viewer renders. `blocks` reuse the one block
 * schema of the content format, so a block type the UI does not know cannot
 * pass validation. */
export const lessonResponseSchema = lessonSummaryResponseSchema.extend({
  blocks: z.array(contentBlockSchema),
});
export type LessonResponse = z.infer<typeof lessonResponseSchema>;

/** `GET /lessons?language=pl&level=a1`. Both are required; unrelated
 * parameters (cache busters) are ignored and a repeated one is rejected. */
export const lessonListQuerySchema = z.object({
  language: languageIdSchema,
  level: levelIdSchema,
});
export type LessonListQuery = z.infer<typeof lessonListQuerySchema>;

/** A lesson is addressed by its permanent content id, so the same strict
 * pattern applies: nothing here can carry path separators, markup or SQL. */
export const lessonIdParamSchema = z.object({ lessonId: contentIdSchema });

/**
 * `POST /lessons/:lessonId/start` and `/complete` take no input at all: the
 * user comes from the session, the lesson from the URL, and the time and the
 * resulting status from the server. Any key in a body — `userId`,
 * `completedAt`, `status`, `role` — is rejected rather than silently ignored,
 * so a client can never believe it set one. No body is the normal case.
 */
export const lessonActionRequestSchema = z.strictObject({}).optional();
