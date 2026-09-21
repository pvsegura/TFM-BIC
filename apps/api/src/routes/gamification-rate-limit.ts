import type { AppEnv } from "@tfm-bic/config";

/** The dashboard makes a summary request and the achievements page one more; a student
 * flipping between them stays far below this. Only a script polling would reach it. */
const READS_PER_MINUTE = 120;

/** Same E2E-only relaxation as the auth, catalog, lesson and exercise routes (see
 * auth.route.ts and packages/config): a full Playwright run shares one server and one client
 * address. The strict limit is still exercised by the route tests. */
const E2E_RATE_LIMIT_MULTIPLIER = 100;

export function gamificationReadRateLimit(env: AppEnv) {
  return {
    max: env.E2E_RELAXED_RATE_LIMITS
      ? READS_PER_MINUTE * E2E_RATE_LIMIT_MULTIPLIER
      : READS_PER_MINUTE,
    timeWindow: "1 minute",
  };
}
