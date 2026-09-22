import {
  vocabularyCategoriesResponseSchema,
  vocabularyItemResponseSchema,
  vocabularyListResponseSchema,
  vocabularyUserStateResponseSchema,
  type VocabularyCategoriesResponse,
  type VocabularyItemResponse,
  type VocabularyListResponse,
  type VocabularyStatusRequest,
  type VocabularyUserStateResponse,
} from "@tfm-bic/contracts";

import { requestJson } from "./api-request.js";

/**
 * Vocabulary is per-student, so — like lessons and exercises — every request carries the session
 * cookie and the user is identified by that cookie alone. Same-origin like the rest (see
 * vite.config.ts). Every response is validated against the shared contract (an allowlist); the
 * server is the one place a filter is validated (its query schema's `limit` takes a wire-format
 * digit string, this client's a plain number — the two are not the same shape to reuse directly).
 */
const enc = encodeURIComponent;

export interface VocabularyFilters {
  level?: string;
  category?: string;
  status?: string;
  q?: string;
  limit?: number;
  after?: string;
}

function queryString(languageCode: string, filters: VocabularyFilters): string {
  const params = new URLSearchParams({ language: languageCode });
  if (filters.level !== undefined) params.set("level", filters.level);
  if (filters.category !== undefined) params.set("category", filters.category);
  if (filters.status !== undefined) params.set("status", filters.status);
  if (filters.q !== undefined) params.set("q", filters.q);
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  if (filters.after !== undefined) params.set("after", filters.after);
  return params.toString();
}

export async function fetchVocabulary(
  languageCode: string,
  filters: VocabularyFilters = {},
): Promise<VocabularyListResponse> {
  return vocabularyListResponseSchema.parse(
    await requestJson(`/vocabulary?${queryString(languageCode, filters)}`),
  );
}

export async function fetchUserVocabulary(
  languageCode: string,
  filters: VocabularyFilters = {},
): Promise<VocabularyListResponse> {
  return vocabularyListResponseSchema.parse(
    await requestJson(`/user-vocabulary?${queryString(languageCode, filters)}`),
  );
}

export async function fetchVocabularyCategories(
  languageCode: string,
): Promise<VocabularyCategoriesResponse> {
  return vocabularyCategoriesResponseSchema.parse(
    await requestJson(`/vocabulary/categories?language=${enc(languageCode)}`),
  );
}

export async function fetchVocabularyItem(vocabularyId: string): Promise<VocabularyItemResponse> {
  return vocabularyItemResponseSchema.parse(await requestJson(`/vocabulary/${enc(vocabularyId)}`));
}

/** Every action below sends no body except the status update: the server knows the user
 * (session), the word (URL) and the time. */
export async function saveVocabularyItem(
  vocabularyId: string,
): Promise<VocabularyUserStateResponse> {
  return vocabularyUserStateResponseSchema.parse(
    await requestJson(`/vocabulary/${enc(vocabularyId)}/save`, { method: "POST" }),
  );
}

export async function unsaveVocabularyItem(
  vocabularyId: string,
): Promise<VocabularyUserStateResponse> {
  return vocabularyUserStateResponseSchema.parse(
    await requestJson(`/vocabulary/${enc(vocabularyId)}/unsave`, { method: "POST" }),
  );
}

export async function markVocabularyItemLearned(
  vocabularyId: string,
): Promise<VocabularyUserStateResponse> {
  return vocabularyUserStateResponseSchema.parse(
    await requestJson(`/vocabulary/${enc(vocabularyId)}/learned`, { method: "POST" }),
  );
}

export async function updateVocabularyStatus(
  vocabularyId: string,
  status: VocabularyStatusRequest["status"],
): Promise<VocabularyUserStateResponse> {
  const body: VocabularyStatusRequest = { status };
  return vocabularyUserStateResponseSchema.parse(
    await requestJson(`/vocabulary/${enc(vocabularyId)}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}
