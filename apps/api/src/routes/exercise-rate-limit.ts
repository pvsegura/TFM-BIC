import type { AppEnv } from "@tfm-bic/config";

import { routeRateLimit } from "../security/rate-limits.js";

/** Reads (list, open) cost a couple of calls per exercise; this leaves ample headroom for a student working through a lesson. */
const READS_PER_MINUTE = 120;

/** Every accepted answer is a stored row, so submissions get their own, tighter bound: a
 * real student answers a few times a minute at most, and a script could otherwise
 * insert attempts without limit. */
const ANSWERS_PER_MINUTE = 60;

/** Per client address; relaxed only for E2E runs (security/rate-limits.ts). */
function limit(env: AppEnv, perMinute: number) {
  return routeRateLimit(env, perMinute, "1 minute");
}

export const exerciseReadRateLimit = (env: AppEnv) => limit(env, READS_PER_MINUTE);
export const exerciseAnswerRateLimit = (env: AppEnv) => limit(env, ANSWERS_PER_MINUTE);
