import type { AppEnv } from "@tfm-bic/config";

/** Each uncached clip is a paid provider call. A learner listening through a word list is well
 * under this; a script hammering the endpoint is not. Identical requests are served from the
 * cache, but still count here. */
const GENERATIONS_PER_HOUR = 30;

/** Same E2E-only relaxation as every other route (see auth.route.ts and packages/config): a full
 * Playwright run shares one server and one client address. The strict limit is still exercised by
 * the route tests. */
const E2E_RATE_LIMIT_MULTIPLIER = 100;

export const audioGenerationRateLimit = (env: AppEnv) => ({
  max: env.E2E_RELAXED_RATE_LIMITS
    ? GENERATIONS_PER_HOUR * E2E_RATE_LIMIT_MULTIPLIER
    : GENERATIONS_PER_HOUR,
  timeWindow: "1 hour",
});
