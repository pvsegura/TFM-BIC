import type { AppEnv } from "@tfm-bic/config";

/** Generation is expensive (a real provider renders a video); a student starting one every few
 * minutes is a real usage pattern, starting one every few seconds is not. */
const CREATE_PER_HOUR = 10;

/** Polling for status costs nothing expensive server-side, but still gets its own, generous bound. */
const STATUS_READS_PER_MINUTE = 30;

/** Same E2E-only relaxation as the auth, catalog, lesson, exercise, gamification, vocabulary and
 * phonetics routes (see auth.route.ts and packages/config): a full Playwright run shares one
 * server and one client address. The strict limits are still exercised by the route tests. */
const E2E_RATE_LIMIT_MULTIPLIER = 100;

function limit(env: AppEnv, max: number, timeWindow: string) {
  return {
    max: env.E2E_RELAXED_RATE_LIMITS ? max * E2E_RATE_LIMIT_MULTIPLIER : max,
    timeWindow,
  };
}

export const videoGenerationCreateRateLimit = (env: AppEnv) =>
  limit(env, CREATE_PER_HOUR, "1 hour");

export const videoGenerationStatusRateLimit = (env: AppEnv) =>
  limit(env, STATUS_READS_PER_MINUTE, "1 minute");
