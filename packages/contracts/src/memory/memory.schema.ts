import { RECALL_GRADES } from "@verbysia/domain";
import { z } from "zod";

import { boundedIntText } from "../common/whole-number-text.js";
import { languageIdSchema, vocabularyItemIdSchema } from "../content/identifiers.schema.js";

const isoTimestamp = z.iso.datetime();
const count = z.number().int().min(0);

export const memorySessionQuerySchema = z.strictObject({
  language: languageIdSchema,
  limit: boundedIntText(1, 50).optional(),
});

export const memoryStatsQuerySchema = z.strictObject({ language: languageIdSchema });

/** One answer. `clientReviewId` is a UUID the client generates per answer (safe retries). */
export const memoryReviewRequestSchema = z.strictObject({
  vocabularyItemId: vocabularyItemIdSchema,
  grade: z.enum(RECALL_GRADES),
  clientReviewId: z.uuid(),
  usedHint: z.boolean(),
});

export const memoryCardResponseSchema = z.object({
  vocabularyItemId: vocabularyItemIdSchema,
  lemma: z.string(),
  translation: z.string(),
  note: z.string().nullable(),
  partOfSpeech: z.string().nullable(),
  gender: z.string().nullable(),
  example: z.object({ text: z.string(), translation: z.string() }).nullable(),
  categoryTitle: z.string(),
  isNew: z.boolean(),
  dueAt: isoTimestamp.nullable(),
  intervalDays: count,
  difficult: z.boolean(),
});

export const memorySessionResponseSchema = z.object({
  cards: z.array(memoryCardResponseSchema),
  dueCount: count,
  newAvailable: count,
});

export const memoryReviewResponseSchema = z.object({
  card: memoryCardResponseSchema,
  duplicate: z.boolean(),
});

export const memoryStatsResponseSchema = z.object({
  totalCards: count,
  dueNow: count,
  learning: count,
  mature: count,
  difficult: count,
  newAvailable: count,
  reviewsToday: count,
  retention30d: z.number().min(0).max(1).nullable(),
  streakDays: count,
  forecast: z.array(count).length(7),
});

export type MemoryCardResponse = z.infer<typeof memoryCardResponseSchema>;
export type MemorySessionResponse = z.infer<typeof memorySessionResponseSchema>;
export type MemoryReviewRequest = z.infer<typeof memoryReviewRequestSchema>;
export type MemoryReviewResponse = z.infer<typeof memoryReviewResponseSchema>;
export type MemoryStatsResponse = z.infer<typeof memoryStatsResponseSchema>;

/** The four answer buttons, in display order (re-exported so the web never imports the domain). */
export const MEMORY_GRADES = RECALL_GRADES;
export type MemoryGrade = (typeof MEMORY_GRADES)[number];
