import {
  COACH_MESSAGE_MAX_LENGTH,
  COACH_MODES,
  COACH_TURN_ROLES,
  MAX_HISTORY_TURNS,
  MAX_HISTORY_TURN_LENGTH,
  PRACTICE_EXPLANATION_MAX_LENGTH,
  PRACTICE_MAX_ITEMS,
  PRACTICE_MAX_OPTIONS,
  PRACTICE_MIN_OPTIONS,
  PRACTICE_OPTION_MAX_LENGTH,
  PRACTICE_PROMPT_MAX_LENGTH,
  PRACTICE_TITLE_MAX_LENGTH,
} from "@tfm-bic/domain";
import { z } from "zod";

import { contentIdSchema, vocabularyItemIdSchema } from "../content/identifiers.schema.js";

/**
 * AI Coach shapes (M23, ADR-034). Every object is strict: a `userId`, a `studentId`, a model name,
 * a provider, a temperature or a system prompt in the body is **rejected**, not ignored — the only
 * things a client may choose are the mode, the message, the conversation it is continuing and
 * which page it is asking from.
 *
 * All the limits are the domain's own constants, so the wire format and the business rule cannot
 * drift apart.
 */

/** What the learner has open, as an id the backend re-authorises before using. */
const coachContextSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("lesson"), lessonId: contentIdSchema }),
  z.strictObject({ type: z.literal("exercise"), exerciseId: contentIdSchema }),
  z.strictObject({ type: z.literal("vocabulary-item"), vocabularyItemId: vocabularyItemIdSchema }),
  z.strictObject({ type: z.literal("video"), lessonId: contentIdSchema }),
  z.strictObject({ type: z.literal("phonetic"), phoneticId: contentIdSchema }),
]);
export type CoachContextRef = z.infer<typeof coachContextSchema>;

/**
 * One earlier turn, as the client replays it. Only a role and text: a client cannot send a tool
 * call, a tool result, a provider signature or a token, because this schema has nowhere to put
 * them (ADR-034, decision 5). The server normalises and caps this again in the domain.
 */
const coachTurnSchema = z.strictObject({
  role: z.enum(COACH_TURN_ROLES),
  text: z.string().min(1).max(MAX_HISTORY_TURN_LENGTH),
});

/** `POST /ai-coach/messages`. */
export const coachMessageRequestSchema = z.strictObject({
  message: z.string().min(1).max(COACH_MESSAGE_MAX_LENGTH),
  mode: z.enum(COACH_MODES).default("explain"),
  /** The language being learned. Required: the coach is always about one course. */
  language: z
    .string()
    .min(2)
    .max(3)
    .regex(/^[a-z]+$/, { message: "must be a lowercase language code" }),
  history: z.array(coachTurnSchema).max(MAX_HISTORY_TURNS).default([]),
  context: coachContextSchema.optional(),
});
export type CoachMessageRequestBody = z.infer<typeof coachMessageRequestSchema>;

/** A generated activity, validated by the domain before it is ever parsed into this. */
export const coachPracticeSchema = z.strictObject({
  title: z.string().min(1).max(PRACTICE_TITLE_MAX_LENGTH),
  items: z
    .array(
      z.strictObject({
        prompt: z.string().min(1).max(PRACTICE_PROMPT_MAX_LENGTH),
        options: z
          .array(z.string().min(1).max(PRACTICE_OPTION_MAX_LENGTH))
          .min(PRACTICE_MIN_OPTIONS)
          .max(PRACTICE_MAX_OPTIONS),
        answerIndex: z.number().int().min(0),
        explanation: z.string().min(1).max(PRACTICE_EXPLANATION_MAX_LENGTH),
      }),
    )
    .min(1)
    .max(PRACTICE_MAX_ITEMS),
});
export type CoachPracticeResponse = z.infer<typeof coachPracticeSchema>;

/**
 * The answer. `toolsUsed` is shown to the learner ("I looked at your recent attempts"), which is
 * the product's answer to black-box AI: the names are our own, fixed strings — never an internal
 * path, a query or a provider detail.
 */
export const coachMessageResponseSchema = z.strictObject({
  answer: z.string().min(1),
  mode: z.enum(COACH_MODES),
  toolsUsed: z.array(z.string().max(64)).max(16),
  practice: coachPracticeSchema.nullable(),
});
export type CoachMessageResponse = z.infer<typeof coachMessageResponseSchema>;

/**
 * `GET /ai-coach/status?language=pl` — whether the feature is on, so the UI can say so before a
 * learner types, and (with a language) the course context the coach will actually be given.
 *
 * `learner.cefrLevel` is here so the page can show the learner the level the coach is told, rather
 * than letting them assume. It is **derived by the server** from their own progress; it is not
 * something a client can set, which is why it appears in a response and in no request.
 */
export const coachStatusQuerySchema = z.strictObject({
  language: z
    .string()
    .min(2)
    .max(3)
    .regex(/^[a-z]+$/, { message: "must be a lowercase language code" })
    .optional(),
});

export const coachStatusResponseSchema = z.strictObject({
  available: z.boolean(),
  modes: z.array(z.enum(COACH_MODES)),
  maxMessageLength: z.number().int().positive(),
  learner: z
    .strictObject({
      languageId: z.string().min(2).max(3),
      languageName: z.string().min(1),
      /** `null` when the application has nothing to derive a level from. */
      cefrLevel: z.string().min(2).max(2).nullable(),
    })
    .nullable(),
});
export type CoachStatusResponse = z.infer<typeof coachStatusResponseSchema>;
