import type { AppEnv } from "@tfm-bic/config";

/** Lesson routes are authenticated, but a session is not a reason to allow
 * unlimited requests: opening a lesson costs a handful of calls (list, detail,
 * start), and this leaves ample headroom for a student clicking around. */
const LESSON_REQUESTS_PER_MINUTE = 120;

/** Same E2E-only relaxation as the auth and catalog routes (see auth.route.ts
 * and packages/config): a full Playwright run shares one server and one client
 * address. The strict limit is still exercised by the route tests. */
const E2E_RATE_LIMIT_MULTIPLIER = 100;

export function lessonRateLimit(env: AppEnv) {
  return {
    max: env.E2E_RELAXED_RATE_LIMITS
      ? LESSON_REQUESTS_PER_MINUTE * E2E_RATE_LIMIT_MULTIPLIER
      : LESSON_REQUESTS_PER_MINUTE,
    timeWindow: "1 minute",
  };
}
