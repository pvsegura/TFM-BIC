import { AUDIO_FORMATS, VOICE_PROFILES } from "@tfm-bic/domain";
import { z } from "zod";

import { vocabularyItemIdSchema } from "../content/identifiers.schema.js";

/**
 * Audio generation shapes (M12, ADR-013). The client never sends the text to speak: it names a
 * piece of content, and the server reads the text from the catalog. Every object is strict — a
 * `text`, `userId`, provider or model is rejected, never silently ignored.
 */

/** Which of a vocabulary entry's texts to speak. */
export const VOCABULARY_AUDIO_PART_VALUES = ["lemma", "example"] as const;

const vocabularyItemSourceSchema = z.strictObject({
  type: z.literal("vocabulary-item"),
  vocabularyItemId: vocabularyItemIdSchema,
  part: z.enum(VOCABULARY_AUDIO_PART_VALUES),
});

/**
 * `POST /audio-generations`. `source` is a discriminated union so later consumers (phonetic
 * examples, lesson narration) add a member instead of a new endpoint; today there is one.
 */
export const audioGenerationRequestSchema = z.strictObject({
  source: z.discriminatedUnion("type", [vocabularyItemSourceSchema]),
  voice: z.enum(VOICE_PROFILES).default("standard"),
});
export type AudioGenerationRequestBody = z.infer<typeof audioGenerationRequestSchema>;

/** The response body is the audio itself, with one of these `Content-Type`s. */
export const AUDIO_RESPONSE_CONTENT_TYPES = AUDIO_FORMATS;
