import {
  memoryReviewResponseSchema,
  memorySessionResponseSchema,
  memoryStatsResponseSchema,
  type MemoryReviewRequest,
  type MemoryReviewResponse,
  type MemorySessionResponse,
  type MemoryStatsResponse,
} from "@verbysia/contracts";

import { requestJson } from "./api-request.js";

/** The course language the memory trainer works on (Spanish for Polish speakers). */
export const MEMORY_LANGUAGE = "es";

export async function fetchMemorySession(limit = 20): Promise<MemorySessionResponse> {
  return memorySessionResponseSchema.parse(
    await requestJson(`/memory/session?language=${MEMORY_LANGUAGE}&limit=${String(limit)}`),
  );
}

export async function fetchMemoryStats(): Promise<MemoryStatsResponse> {
  return memoryStatsResponseSchema.parse(
    await requestJson(`/memory/stats?language=${MEMORY_LANGUAGE}`),
  );
}

export async function submitMemoryReview(
  review: MemoryReviewRequest,
): Promise<MemoryReviewResponse> {
  return memoryReviewResponseSchema.parse(
    await requestJson("/memory/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(review),
    }),
  );
}
