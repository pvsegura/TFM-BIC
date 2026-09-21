import { EXERCISE_RESULT_STATUSES, EXERCISE_TYPES, MAX_TEXT_ANSWER_LENGTH } from "@tfm-bic/domain";
import { z } from "zod";

import {
  contentIdSchema,
  exerciseIdSchema,
  languageIdSchema,
  levelIdSchema,
} from "../content/identifiers.schema.js";
import { multipleChoicePresentedSchema } from "./types/multiple-choice.schema.js";
import { textAnswerPresentedSchema } from "./types/text-answer.schema.js";
import { trueFalsePresentedSchema } from "./types/true-false.schema.js";

/**
 * Student-facing exercise shapes (M7). Like the lesson shapes they are
 * allowlists — Zod drops any key not named — and generic: one shape per exercise
 * *type*, none per language. The two halves of an exercise stay separate:
 * **presentation** (safe before answering, never an answer key) and
 * **evaluation** (returned only after an answer is submitted).
 */

/** The longest text answer the API accepts, for the text field's own limit. Re-exported so the
 * web app does not need the domain package for one number. */
export { MAX_TEXT_ANSWER_LENGTH };

/** Times cross the wire as ISO 8601 strings, produced by the server's clock. */
const isoTimestamp = z.iso.datetime();

/** The student's own standing on one exercise, derived from their attempts. */
export const exerciseResultResponseSchema = z.object({
  status: z.enum(EXERCISE_RESULT_STATUSES),
  attemptCount: z.number().int().min(0),
  lastAnsweredAt: isoTimestamp.nullable(),
});
export type ExerciseResultResponse = z.infer<typeof exerciseResultResponseSchema>;

const withResult = { result: exerciseResultResponseSchema };

/**
 * One exercise as shown before answering, plus the caller's own result. The
 * union is discriminated on `type`; adding an exercise type adds one member here.
 */
export const exerciseResponseSchema = z.discriminatedUnion("type", [
  multipleChoicePresentedSchema.extend(withResult),
  textAnswerPresentedSchema.extend(withResult),
  trueFalsePresentedSchema.extend(withResult),
]);
export type ExerciseResponse = z.infer<typeof exerciseResponseSchema>;

/** What a list row needs: where the exercise is, what kind it is, its prompt and the caller's result. No options, no key. */
export const exerciseSummaryResponseSchema = z.object({
  id: exerciseIdSchema,
  lessonId: contentIdSchema,
  languageId: languageIdSchema,
  levelId: levelIdSchema,
  type: z.enum(EXERCISE_TYPES),
  order: z.number().int(),
  prompt: z.string(),
  instructionLanguage: languageIdSchema,
  result: exerciseResultResponseSchema,
});
export type ExerciseSummaryResponse = z.infer<typeof exerciseSummaryResponseSchema>;

/** The lesson's exercises in explicit order, and how many the caller has answered — the "have I done them all" fact, stated once by the server. */
export const exerciseListResponseSchema = z.object({
  exercises: z.array(exerciseSummaryResponseSchema),
  progress: z.object({
    total: z.number().int().min(0),
    answered: z.number().int().min(0),
  }),
});
export type ExerciseListResponse = z.infer<typeof exerciseListResponseSchema>;

/** An exercise is addressed by its permanent id; the same strict pattern as everywhere, so nothing here can carry path separators, markup or SQL. */
export const exerciseIdParamSchema = z.object({ exerciseId: exerciseIdSchema });

/**
 * `POST /exercises/:exerciseId/answer`. The client sends *an answer* and nothing
 * else: no verdict, user, score, time or exercise type — any other key is
 * rejected (not ignored), so a client can never believe it set one. The answer
 * is a string (an option id or typed text) or a boolean; whether it is a
 * well-formed answer *for this exercise* is decided on the server, by the
 * exercise's own evaluator.
 */
export const exerciseAnswerRequestSchema = z.strictObject({
  answer: z.union([z.string().max(MAX_TEXT_ANSWER_LENGTH), z.boolean()]),
});
export type ExerciseAnswerRequest = z.infer<typeof exerciseAnswerRequestSchema>;

/**
 * The verdict on a submitted answer, and only that: whether it was correct, the
 * exercise's own static feedback, the answer that was correct (in the shape of a
 * submitted answer) and the caller's updated result. No accepted-answer list,
 * no evaluator settings.
 */
export const exerciseAnswerResponseSchema = z.object({
  correct: z.boolean(),
  feedback: z.string().nullable(),
  correctAnswer: z.union([z.string(), z.boolean()]),
  result: exerciseResultResponseSchema,
});
export type ExerciseAnswerResponse = z.infer<typeof exerciseAnswerResponseSchema>;
