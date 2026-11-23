import {
  exerciseAnswerResponseSchema,
  exerciseListResponseSchema,
  exerciseResponseSchema,
  type ExerciseAnswerRequest,
  type ExerciseAnswerResponse,
  type ExerciseListResponse,
  type ExerciseResponse,
} from "@verbysia/contracts";

import { requestPublicJson, toApiError } from "./api-request.js";

/**
 * The free demo (no account): the same exercises, served and evaluated by the API's public
 * routes for free lessons only. Nothing is stored on the server — progress lives in the browser
 * (demo-progress.ts) until the visitor creates an account.
 */
const enc = encodeURIComponent;

export async function fetchDemoExercises(lessonId: string): Promise<ExerciseListResponse> {
  return exerciseListResponseSchema.parse(
    await requestPublicJson(`/public/lessons/${enc(lessonId)}/exercises`),
  );
}

export async function fetchDemoExercise(exerciseId: string): Promise<ExerciseResponse> {
  return exerciseResponseSchema.parse(
    await requestPublicJson(`/public/exercises/${enc(exerciseId)}`),
  );
}

export async function submitDemoAnswer(
  exerciseId: string,
  answer: ExerciseAnswerRequest["answer"],
): Promise<ExerciseAnswerResponse> {
  const body: ExerciseAnswerRequest = { answer };
  const response = await fetch(`/public/exercises/${enc(exerciseId)}/answer`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await toApiError(response);
  return exerciseAnswerResponseSchema.parse(await response.json());
}
