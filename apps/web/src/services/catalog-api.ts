import {
  contentListResponseSchema,
  contentResponseSchema,
  languageLevelsResponseSchema,
  languagesResponseSchema,
  type ContentListResponse,
  type ContentResponse,
  type LanguageLevelsResponse,
  type LanguagesResponse,
} from "@tfm-bic/contracts";

import { requestPublicJson } from "./api-request.js";

/**
 * Language and content discovery is public and read-only, so — unlike the
 * auth and profile clients — these requests ask for no credentials
 * (`requestPublicJson`). Same-origin like the rest (see vite.config.ts).
 */
const getJson = requestPublicJson;

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
