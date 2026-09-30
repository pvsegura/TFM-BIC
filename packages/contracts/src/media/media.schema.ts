import { z } from "zod";

/**
 * Educational media (M21, ADR-031).
 *
 * 1. Content-side files the offline pipeline reads (never the API or the browser):
 *    content/languages/<lang>/media/narrators.json and plan.json.
 * 2. The API responses the web app reads: published media for a lesson or a vocabulary item.
 *    They name no provider, voice or storage — only what the page needs to play and describe it.
 */

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const narratorId = z.string().regex(/^[a-z][a-z0-9-]{1,31}$/);

export const narratorsFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  languageId: slug,
  narrators: z
    .array(
      z.strictObject({
        id: narratorId,
        displayName: z.string().min(1).max(40),
        tts: z.strictObject({
          provider: z.literal("gemini"),
          /** A prebuilt voice name from the Gemini speech-generation docs (verified 2026-09-30). */
          voice: z.string().regex(/^[A-Z][a-z]+$/),
          style: z.string().min(1).max(300),
        }),
      }),
    )
    .min(1),
});

export const mediaPlanFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  languageId: slug,
  lessons: z.array(
    z.strictObject({ contentId: slug, narratorId, priority: z.number().int().min(1).max(3) }),
  ),
  vocabularyCategories: z.array(
    z.strictObject({ categoryId: slug, narratorId, priority: z.number().int().min(1).max(3) }),
  ),
  vocabularyPictograms: z.record(slug, z.string().regex(/^[a-z0-9-]+$/)),
});

export type NarratorsFile = z.infer<typeof narratorsFileSchema>;
export type MediaPlanFile = z.infer<typeof mediaPlanFileSchema>;

const transcriptLineSchema = z.object({
  text: z.string(),
  language: z.string(),
  translation: z.string().optional(),
});

export const videoAssetResponseSchema = z.object({
  purpose: z.enum(["lesson-explanation", "vocabulary-explanation"]),
  url: z.string(),
  posterUrl: z.string(),
  captionsUrl: z.string(),
  captionsLanguage: z.string(),
  durationSeconds: z.number(),
  width: z.number().int(),
  height: z.number().int(),
  narrator: z.string(),
  transcript: z.array(transcriptLineSchema),
});

export const audioAssetResponseSchema = z.object({
  purpose: z.enum(["pronunciation", "example-pronunciation"]),
  url: z.string(),
  durationSeconds: z.number(),
  text: z.string(),
  language: z.string(),
  narrator: z.string(),
});

/** `GET /media/lessons/:lessonId` and `GET /media/vocabulary/:vocabularyId`. */
export const contentMediaResponseSchema = z.object({
  contentType: z.enum(["lesson", "vocabulary-item"]),
  contentId: z.string(),
  /** `null` = no video published yet — the page says "Video coming soon". */
  video: videoAssetResponseSchema.nullable(),
  audio: z.array(audioAssetResponseSchema),
});

/** `GET /media` — which content has a video, for lists and badges (no transcripts). */
export const mediaIndexResponseSchema = z.object({
  items: z.array(
    z.object({
      contentType: z.enum(["lesson", "vocabulary-item"]),
      contentId: z.string(),
      hasVideo: z.boolean(),
      hasAudio: z.boolean(),
      durationSeconds: z.number().nullable(),
      posterUrl: z.string().nullable(),
      narrator: z.string().nullable(),
    }),
  ),
});

export type VideoAssetResponse = z.infer<typeof videoAssetResponseSchema>;
export type AudioAssetResponse = z.infer<typeof audioAssetResponseSchema>;
export type ContentMediaResponse = z.infer<typeof contentMediaResponseSchema>;
export type MediaIndexResponse = z.infer<typeof mediaIndexResponseSchema>;
