import type { AppEnv } from "@tfm-bic/config";

/** Browsing, a detail view and "My Vocabulary" cost a handful of calls per page; this leaves
 * ample headroom for a student filtering and paging through their words. */
const READS_PER_MINUTE = 120;

/** Save/unsave/mark-learned/status-update are each one stored (or removed) row, so writes get
 * their own, tighter bound — a real student acts on a word a few times a minute at most. */
const WRITES_PER_MINUTE = 60;

/** Same E2E-only relaxation as the auth, catalog, lesson, exercise and gamification routes (see
 * auth.route.ts and packages/config): a full Playwright run shares one server and one client
 * address. The strict limits are still exercised by the route tests. */
const E2E_RATE_LIMIT_MULTIPLIER = 100;

function limit(env: AppEnv, perMinute: number) {
  return {
    max: env.E2E_RELAXED_RATE_LIMITS ? perMinute * E2E_RATE_LIMIT_MULTIPLIER : perMinute,
    timeWindow: "1 minute",
  };
}

export const vocabularyReadRateLimit = (env: AppEnv) => limit(env, READS_PER_MINUTE);
export const vocabularyWriteRateLimit = (env: AppEnv) => limit(env, WRITES_PER_MINUTE);
