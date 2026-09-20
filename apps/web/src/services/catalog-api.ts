import {
  catalogErrorResponseSchema,
  contentListResponseSchema,
  contentResponseSchema,
  languageLevelsResponseSchema,
  languagesResponseSchema,
  type ContentListResponse,
  type ContentResponse,
  type LanguageLevelsResponse,
  type LanguagesResponse,
} from "@tfm-bic/contracts";

import { ApiError } from "./api-error.js";

/**
 * Language and content discovery is public and read-only, so — unlike the
 * auth and profile clients — these requests send no credentials. Same-origin
 * like the rest (see vite.config.ts): the browser only ever talks to one origin.
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

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return response.json();
}

/** Every value that becomes part of a URL is percent-encoded, so a route
 * parameter can never add path segments or query parameters to a request. */
const enc = encodeURIComponent;

export async function fetchLanguages(): Promise<LanguagesResponse> {
  return languagesResponseSchema.parse(await getJson("/languages"));
}

export async function fetchLanguageLevels(languageCode: string): Promise<LanguageLevelsResponse> {
  return languageLevelsResponseSchema.parse(
    await getJson(`/languages/${enc(languageCode)}/levels`),
  );
}

export async function fetchContentList(
  languageCode: string,
  levelId: string,
): Promise<ContentListResponse> {
  return contentListResponseSchema.parse(
    await getJson(`/content?language=${enc(languageCode)}&level=${enc(levelId)}`),
  );
}

export async function fetchContent(contentId: string): Promise<ContentResponse> {
  return contentResponseSchema.parse(await getJson(`/content/${enc(contentId)}`));
}
