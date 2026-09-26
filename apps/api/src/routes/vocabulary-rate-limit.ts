import type { AppEnv } from "@tfm-bic/config";

import { routeRateLimit } from "../security/rate-limits.js";

/** Browsing, a detail view and "My Vocabulary" cost a handful of calls per page; this leaves
 * ample headroom for a student filtering and paging through their words. */
const READS_PER_MINUTE = 120;

/** Save/unsave/mark-learned/status-update are each one stored (or removed) row, so writes get
 * their own, tighter bound — a real student acts on a word a few times a minute at most. */
const WRITES_PER_MINUTE = 60;

/** Per client address; relaxed only for E2E runs (security/rate-limits.ts). */
function limit(env: AppEnv, perMinute: number) {
  return routeRateLimit(env, perMinute, "1 minute");
}

export const vocabularyReadRateLimit = (env: AppEnv) => limit(env, READS_PER_MINUTE);
export const vocabularyWriteRateLimit = (env: AppEnv) => limit(env, WRITES_PER_MINUTE);
