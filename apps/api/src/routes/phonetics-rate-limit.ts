import type { AppEnv } from "@tfm-bic/config";

import { routeRateLimit } from "../security/rate-limits.js";

/** Browsing, a detail view and the topics list cost a handful of calls per page; this leaves ample
 * headroom for a student filtering and paging through the content. */
const READS_PER_MINUTE = 120;

/** View/practice/complete are each one stored row, so writes get their own, tighter bound — a real
 * student acts on a representation a few times a minute at most. */
const WRITES_PER_MINUTE = 60;

/** Per client address; relaxed only for E2E runs (security/rate-limits.ts). */
function limit(env: AppEnv, perMinute: number) {
  return routeRateLimit(env, perMinute, "1 minute");
}

export const phoneticsReadRateLimit = (env: AppEnv) => limit(env, READS_PER_MINUTE);
export const phoneticsWriteRateLimit = (env: AppEnv) => limit(env, WRITES_PER_MINUTE);
