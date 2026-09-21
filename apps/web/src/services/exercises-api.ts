import {
  catalogErrorResponseSchema,
  exerciseAnswerResponseSchema,
  exerciseListResponseSchema,
  exerciseResponseSchema,
  type ExerciseAnswerRequest,
  type ExerciseAnswerResponse,
  type ExerciseListResponse,
  type ExerciseResponse,
} from "@tfm-bic/contracts";

import { ApiError } from "./api-error.js";

/**
 * Exercises are per-student, so — like lessons — every request carries the
 * session cookie and the user is identified by that cookie alone: no user id,
 * verdict, score or time is ever sent. The only thing the client sends is the
 * student's answer; the server decides whether it is correct. Same-origin like
 * the rest (see vite.config.ts). Every response is validated against the shared
 * contract, which is an allowlist: a field the contract does not name — an
 * answer key that leaked, say — is dropped before it can reach a component.
 */
const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const parsed = catalogErrorResponseSchema.safeParse(await response.json());
    return new ApiError(
      parsed.success ? parsed.data.error : GENERIC_ERROR_MESSAGE,
      response.status,
    );
  } catch {
    return new ApiError(GENERIC_ERROR_MESSAGE, response.status);
  }
}

async function requestJson(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, { ...init, credentials: "include" });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return response.json();
}

/** Every value that becomes part of a URL is percent-encoded, so a route
 * parameter can never add path segments or query parameters to a request. */
const enc = encodeURIComponent;

export async function fetchLessonExercises(lessonId: string): Promise<ExerciseListResponse> {
  return exerciseListResponseSchema.parse(
    await requestJson(`/lessons/${enc(lessonId)}/exercises`, {
      headers: { Accept: "application/json" },
    }),
  );
}

export async function fetchExercise(exerciseId: string): Promise<ExerciseResponse> {
  return exerciseResponseSchema.parse(
    await requestJson(`/exercises/${enc(exerciseId)}`, {
      headers: { Accept: "application/json" },
    }),
  );
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
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    }),
  );
}
