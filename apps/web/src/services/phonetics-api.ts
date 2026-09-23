import {
  phoneticListResponseSchema,
  phoneticRepresentationResponseSchema,
  phoneticTopicsResponseSchema,
  phoneticUserProgressResponseSchema,
  type PhoneticListResponse,
  type PhoneticRepresentationResponse,
  type PhoneticTopicsResponse,
  type PhoneticUserProgressResponse,
} from "@tfm-bic/contracts";

import { requestJson } from "./api-request.js";

/**
 * Phonetics progress is per-student, so — like vocabulary — every request carries the session
 * cookie and the user is identified by that cookie alone. Same-origin like the rest (see
 * vite.config.ts). Every response is validated against the shared contract (an allowlist).
 */
const enc = encodeURIComponent;

export interface PhoneticFilters {
  level?: string;
  topic?: string;
  status?: string;
  limit?: number;
  after?: string;
}

function queryString(languageCode: string, filters: PhoneticFilters): string {
  const params = new URLSearchParams({ language: languageCode });
  if (filters.level !== undefined) params.set("level", filters.level);
  if (filters.topic !== undefined) params.set("topic", filters.topic);
  if (filters.status !== undefined) params.set("status", filters.status);
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  if (filters.after !== undefined) params.set("after", filters.after);
  return params.toString();
}

export async function fetchPhonetics(
  languageCode: string,
  filters: PhoneticFilters = {},
): Promise<PhoneticListResponse> {
  return phoneticListResponseSchema.parse(
    await requestJson(`/phonetics?${queryString(languageCode, filters)}`),
  );
}

export async function fetchPhoneticTopics(languageCode: string): Promise<PhoneticTopicsResponse> {
  return phoneticTopicsResponseSchema.parse(
    await requestJson(`/phonetics/topics?language=${enc(languageCode)}`),
  );
}

export async function fetchPhonetic(phoneticId: string): Promise<PhoneticRepresentationResponse> {
  return phoneticRepresentationResponseSchema.parse(
    await requestJson(`/phonetics/${enc(phoneticId)}`),
  );
}

/** Every action below sends no body: the server knows the user (session), the representation
 * (URL) and the time. */
export async function recordPhoneticView(
  phoneticId: string,
): Promise<PhoneticUserProgressResponse> {
  return phoneticUserProgressResponseSchema.parse(
    await requestJson(`/phonetics/${enc(phoneticId)}/view`, { method: "POST" }),
  );
}

export async function recordPhoneticPractice(
  phoneticId: string,
): Promise<PhoneticUserProgressResponse> {
  return phoneticUserProgressResponseSchema.parse(
    await requestJson(`/phonetics/${enc(phoneticId)}/practice`, { method: "POST" }),
  );
}

export async function completePhonetic(phoneticId: string): Promise<PhoneticUserProgressResponse> {
  return phoneticUserProgressResponseSchema.parse(
    await requestJson(`/phonetics/${enc(phoneticId)}/complete`, { method: "POST" }),
  );
}
