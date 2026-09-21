import {
  exerciseAnswerResponseSchema,
  exerciseListResponseSchema,
  exerciseResponseSchema,
  type ExerciseAnswerRequest,
  type ExerciseAnswerResponse,
  type ExerciseListResponse,
  type ExerciseResponse,
} from "@tfm-bic/contracts";

import { requestJson } from "./api-request.js";

/**
 * Exercises are per-student, so — like lessons — every request carries the
 * session cookie and the user is identified by that cookie alone: no user id,
 * verdict, score or time is ever sent. The only thing the client sends is the
 * student's answer; the server decides whether it is correct. Same-origin like
 * the rest (see vite.config.ts). Every response is validated against the shared
 * contract, which is an allowlist: a field the contract does not name — an
 * answer key that leaked, say — is dropped before it can reach a component.
 */
/** Every value that becomes part of a URL is percent-encoded, so a route
 * parameter can never add path segments or query parameters to a request. */
const enc = encodeURIComponent;

export async function fetchLessonExercises(lessonId: string): Promise<ExerciseListResponse> {
  return exerciseListResponseSchema.parse(await requestJson(`/lessons/${enc(lessonId)}/exercises`));
}

export async function fetchExercise(exerciseId: string): Promise<ExerciseResponse> {
  return exerciseResponseSchema.parse(await requestJson(`/exercises/${enc(exerciseId)}`));
}

/** Sends the student's answer — one key, nothing else — and resolves with the
 * server's verdict on it, which the caller shows as it is. */
export async function submitAnswer(
  exerciseId: string,
  answer: ExerciseAnswerRequest["answer"],
): Promise<ExerciseAnswerResponse> {
  const body: ExerciseAnswerRequest = { answer };
  return exerciseAnswerResponseSchema.parse(
    await requestJson(`/exercises/${enc(exerciseId)}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}
