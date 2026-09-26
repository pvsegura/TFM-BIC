import type { AppEnv } from "@tfm-bic/config";

import { routeRateLimit } from "../security/rate-limits.js";

/** Generation is expensive (a real provider renders a video); a student starting one every few
 * minutes is a real usage pattern, starting one every few seconds is not. */
const CREATE_PER_HOUR = 10;

/** Polling for status costs nothing expensive server-side, but still gets its own, generous bound. */
const STATUS_READS_PER_MINUTE = 30;

/** Per client address; relaxed only for E2E runs (security/rate-limits.ts). */
function limit(env: AppEnv, max: number, timeWindow: string) {
  return routeRateLimit(env, max, timeWindow);
}

/** The same creation budget again per signed-in user (M16), whatever address they use. */
export const VIDEO_GENERATIONS_PER_USER = { max: CREATE_PER_HOUR, timeWindow: "1 hour" };

export const videoGenerationCreateRateLimit = (env: AppEnv) =>
  limit(env, CREATE_PER_HOUR, "1 hour");

export const videoGenerationStatusRateLimit = (env: AppEnv) =>
  limit(env, STATUS_READS_PER_MINUTE, "1 minute");
