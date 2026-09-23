import type { AppEnv } from "@tfm-bic/config";

/** Browsing, a detail view and the topics list cost a handful of calls per page; this leaves ample
 * headroom for a student filtering and paging through the content. */
const READS_PER_MINUTE = 120;

/** View/practice/complete are each one stored row, so writes get their own, tighter bound — a real
 * student acts on a representation a few times a minute at most. */
const WRITES_PER_MINUTE = 60;

/** Same E2E-only relaxation as the auth, catalog, lesson, exercise, gamification and vocabulary
 * routes (see auth.route.ts and packages/config): a full Playwright run shares one server and one
 * client address. The strict limits are still exercised by the route tests. */
const E2E_RATE_LIMIT_MULTIPLIER = 100;

function limit(env: AppEnv, perMinute: number) {
  return {
    max: env.E2E_RELAXED_RATE_LIMITS ? perMinute * E2E_RATE_LIMIT_MULTIPLIER : perMinute,
    timeWindow: "1 minute",
  };
}

export const phoneticsReadRateLimit = (env: AppEnv) => limit(env, READS_PER_MINUTE);
export const phoneticsWriteRateLimit = (env: AppEnv) => limit(env, WRITES_PER_MINUTE);
