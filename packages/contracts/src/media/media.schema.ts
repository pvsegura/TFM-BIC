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

const environment = z.enum([
  "street",
  "suburb",
  "cafe",
  "home",
  "kitchen",
  "bedroom",
  "shop",
  "station",
  "office",
  "school",
  "park",
  "airport",
]);
const id = z.string().regex(/^[a-z][a-z0-9-]{0,39}$/);
const x = z.number().min(-200).max(1480);

export const stageSchema = z.strictObject({
  environment,
  time: z.enum(["day", "evening", "night"]).optional(),
  actors: z.array(
    z.strictObject({
      id,
      x,
      facing: z.enum(["left", "right"]),
      offstage: z.boolean().optional(),
      seated: z.boolean().optional(),
    }),
  ),
  props: z.array(
    z.strictObject({
      id,
      type: z.string().regex(/^[a-z0-9-]+$/),
      x,
      y: z.number().min(0).max(720),
      scale: z.number().min(0.2).max(3).optional(),
      hidden: z.boolean().optional(),
      count: z.number().int().min(1).max(9).optional(),
    }),
  ),
  sign: z.string().min(1).max(30).optional(),
});

export const stageActionSchema = z.discriminatedUnion("do", [
  z.strictObject({ do: z.literal("enter"), actor: id, to: x }),
  z.strictObject({ do: z.literal("exit"), actor: id, side: z.enum(["left", "right"]) }),
  z.strictObject({ do: z.literal("walk"), actor: id, to: x }),
  z.strictObject({ do: z.literal("turn"), actor: id, facing: z.enum(["left", "right"]) }),
  z.strictObject({ do: z.literal("point"), actor: id, at: id }),
  z.strictObject({ do: z.literal("raise-hand"), actor: id }),
  z.strictObject({ do: z.literal("wave"), actor: id }),
  z.strictObject({ do: z.literal("nod"), actor: id }),
  z.strictObject({ do: z.literal("shake-head"), actor: id }),
  z.strictObject({ do: z.literal("handshake"), actor: id, with: id }),
  z.strictObject({ do: z.literal("give"), actor: id, prop: id, to: id }),
  z.strictObject({ do: z.literal("pick-up"), actor: id, prop: id }),
  z.strictObject({ do: z.literal("show"), prop: id }),
  z.strictObject({ do: z.literal("hide"), prop: id }),
  z.strictObject({ do: z.literal("highlight"), target: id }),
  z.strictObject({ do: z.literal("sleep"), actor: id }),
]);

const when = z.enum(["lead", "with", "after"]);
const timedAction = z.intersection(stageActionSchema, z.object({ when: when.optional() }));

const planLine = z.strictObject({
  by: z.string().optional(),
  target: z.string().min(1).max(200).optional(),
  say: z.string().min(1).max(300).optional(),
  leadIn: z.number().min(0).max(8).optional(),
  pauseAfter: z.number().min(0).max(8).optional(),
});
const segment = z.enum([
  "situation",
  "target",
  "form",
  "pronunciation",
  "conversation",
  "notice",
  "retrieval",
  "reuse",
  "recap",
]);
const castMember = z.strictObject({
  id,
  name: z.string().min(1).max(30),
  look: z.string().regex(/^[a-z0-9-]+$/),
  voice: z.string().regex(/^[a-z][a-z0-9-]{1,31}$/),
});

export const lessonVideoPlanSchema = z.strictObject({
  schemaVersion: z.literal(2),
  contentId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  objective: z.string().min(10).max(300),
  narrator: z.string(),
  cast: z.array(castMember).min(1),
  targetVocabularyIds: z.array(z.string()),
  scenes: z
    .array(
      z.discriminatedUnion("kind", [
        z.strictObject({
          kind: z.literal("situation"),
          segment,
          overlayTitle: z.boolean().optional(),
          stage: stageSchema,
          beats: z
            .array(
              z.strictObject({
                line: planLine,
                actions: z.array(timedAction).optional(),
                card: z
                  .union([z.boolean(), z.strictObject({ meaning: z.string().min(1) })])
                  .optional(),
              }),
            )
            .min(1),
        }),
        z.strictObject({
          kind: z.literal("focus"),
          segment,
          heading: z.string(),
          phrase: z.string(),
          highlight: z.string().optional(),
          respelling: z.boolean().optional(),
          panels: z
            .array(z.strictObject({ caption: z.string(), text: z.string() }))
            .max(3)
            .optional(),
          lines: z.array(planLine).min(1),
        }),
        z.strictObject({
          kind: z.literal("contrast"),
          segment,
          heading: z.string(),
          items: z
            .array(z.strictObject({ phoneticId: z.string(), word: z.string() }))
            .min(2)
            .max(2),
          lines: z.array(planLine).min(2),
          itemLines: z.array(z.number().int().min(0)),
        }),
        z.strictObject({
          kind: z.literal("retrieval"),
          segment,
          stage: stageSchema,
          setup: z.array(stageActionSchema),
          prompt: z.string().min(3).max(200),
          answer: z.string(),
          answerMeaning: z.string().min(1).optional(),
          answerBy: z.string().optional(),
        }),
        z.strictObject({
          kind: z.literal("next-step"),
          segment,
          heading: z.string(),
          body: z.string(),
          say: z.string(),
        }),
      ]),
    )
    .min(3),
});

export const vocabularyVisualSchema = z.strictObject({
  stage: stageSchema,
  actor: id,
  action: stageActionSchema,
  stage2: stageSchema.optional(),
  actor2: id.optional(),
  action2: stageActionSchema.optional(),
  prompt: z.string().min(3).max(200).optional(),
});

export const mediaPlanFileSchema = z.strictObject({
  schemaVersion: z.literal(2),
  languageId: slug,
  lessons: z.array(z.strictObject({ contentId: slug, priority: z.number().int().min(1).max(3) })),
  vocabularyCategories: z.array(
    z.strictObject({
      categoryId: slug,
      priority: z.number().int().min(1).max(3),
      narrator: narratorId,
      cast: z.array(castMember).min(1),
    }),
  ),
  vocabulary: z.record(slug, vocabularyVisualSchema),
  /** Fixed framing texts in the course's instruction language (default: English). */
  framing: z
    .strictObject({
      selfCheck: z.string().min(3).max(200),
      yourTurn: z.string().min(1).max(40),
      diagramNote: z.string().min(3).max(200),
      roughly: z.string().min(1).max(40),
      palate: z.string().min(1).max(30),
    })
    .optional(),
});

export type LessonVideoPlanFile = z.infer<typeof lessonVideoPlanSchema>;
export type VocabularyVisualFile = z.infer<typeof vocabularyVisualSchema>;

export type NarratorsFile = z.infer<typeof narratorsFileSchema>;
export type MediaPlanFile = z.infer<typeof mediaPlanFileSchema>;

const transcriptLineSchema = z.object({
  text: z.string(),
  language: z.string(),
  translation: z.string().optional(),
  speaker: z.string().optional(),
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
  objective: z.string().optional(),
  targetVocabularyIds: z.array(z.string()).optional(),
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
      targetVocabularyIds: z.array(z.string()),
      /** A word's recorded pronunciation (words are audio only, M22). */
      pronunciationUrl: z.string().nullable(),
    }),
  ),
});

export type VideoAssetResponse = z.infer<typeof videoAssetResponseSchema>;
export type AudioAssetResponse = z.infer<typeof audioAssetResponseSchema>;
export type ContentMediaResponse = z.infer<typeof contentMediaResponseSchema>;
export type MediaIndexResponse = z.infer<typeof mediaIndexResponseSchema>;
