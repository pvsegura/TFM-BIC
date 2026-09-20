import type { AppEnv } from "@tfm-bic/config";

/** Public discovery is cheap (in-memory reads) but unauthenticated, so it is
 * still bounded per client. A student browsing the catalog makes a handful of
 * requests per page; this leaves ample headroom. */
const PUBLIC_REQUESTS_PER_MINUTE = 120;

/** Same E2E-only relaxation as the auth routes (see auth.route.ts and
 * packages/config): a full Playwright run shares one server and one client
 * address. The strict limit is still exercised by the route tests. */
const E2E_RATE_LIMIT_MULTIPLIER = 100;

export function publicRateLimit(env: AppEnv) {
  return {
    max: env.E2E_RELAXED_RATE_LIMITS
      ? PUBLIC_REQUESTS_PER_MINUTE * E2E_RATE_LIMIT_MULTIPLIER
      : PUBLIC_REQUESTS_PER_MINUTE,
    timeWindow: "1 minute",
  };
}
