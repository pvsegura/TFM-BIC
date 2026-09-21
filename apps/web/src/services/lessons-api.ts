import {
  catalogErrorResponseSchema,
  lessonListResponseSchema,
  lessonProgressResponseSchema,
  lessonResponseSchema,
  type LessonListResponse,
  type LessonProgressResponse,
  type LessonResponse,
} from "@tfm-bic/contracts";

import { ApiError } from "./api-error.js";

/**
 * Lessons are per-student, so — unlike the public catalog client — every
 * request carries the session cookie, and the user is identified by that cookie
 * alone: no user id, time or status is ever sent. Same-origin like the rest
 * (see vite.config.ts). Every response is validated against the shared
 * contract, so a lesson with a block type this version does not know, or text
 * that looks like markup, is refused before it can reach a component.
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
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return response.json();
}

/** Every value that becomes part of a URL is percent-encoded, so a route
 * parameter can never add path segments or query parameters to a request. */
const enc = encodeURIComponent;

export async function fetchLessons(
  languageCode: string,
  levelId: string,
): Promise<LessonListResponse> {
  return lessonListResponseSchema.parse(
    await requestJson(`/lessons?language=${enc(languageCode)}&level=${enc(levelId)}`, {}),
  );
}

export async function fetchLesson(lessonId: string): Promise<LessonResponse> {
  return lessonResponseSchema.parse(await requestJson(`/lessons/${enc(lessonId)}`, {}));
}

/** Both actions send no body: the server knows the user (session), the lesson
 * (URL) and the time; the response is the progress it persisted. */
export async function startLesson(lessonId: string): Promise<LessonProgressResponse> {
  return lessonProgressResponseSchema.parse(
    await requestJson(`/lessons/${enc(lessonId)}/start`, { method: "POST" }),
  );
}

export async function completeLesson(lessonId: string): Promise<LessonProgressResponse> {
  return lessonProgressResponseSchema.parse(
    await requestJson(`/lessons/${enc(lessonId)}/complete`, { method: "POST" }),
  );
}
