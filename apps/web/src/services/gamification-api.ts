import {
  achievementsResponseSchema,
  gamificationSummaryResponseSchema,
  pointHistoryResponseSchema,
  type AchievementsResponse,
  type GamificationSummaryResponse,
  type PointHistoryResponse,
} from "@tfm-bic/contracts";

import { requestJson } from "./api-request.js";

/**
 * Points and achievements are per-student and **read-only** here: the client can ask what it
 * has, and there is no call in this module — or in the API — that gives it more. Every request
 * carries the session cookie and nothing else identifies the student: no user id is ever sent,
 * so there is nothing to tamper with. Every response is validated against the shared contract,
 * which is an allowlist, so a field it does not name never reaches a component.
 */

export async function fetchGamificationSummary(): Promise<GamificationSummaryResponse> {
  return gamificationSummaryResponseSchema.parse(await requestJson("/gamification/summary"));
}

export async function fetchAchievements(): Promise<AchievementsResponse> {
  return achievementsResponseSchema.parse(await requestJson("/gamification/achievements"));
}

/**
 * One page of the points history, newest first. `before` is the cursor the previous page
 * returned (`nextBefore`); it is the only thing that can ever be added to the request, and only
 * as a whole number.
 */
export async function fetchPointHistory(before?: number): Promise<PointHistoryResponse> {
  const query =
    before !== undefined && Number.isSafeInteger(before) ? `?before=${String(before)}` : "";
  return pointHistoryResponseSchema.parse(
    await requestJson(`/gamification/point-transactions${query}`),
  );
}
