import type { AppEnv } from "@tfm-bic/config";

import { routeRateLimit } from "../security/rate-limits.js";

/** Public discovery is cheap (in-memory reads) but unauthenticated, so it is
 * still bounded per client. A student browsing the catalog makes a handful of
 * requests per page; this leaves ample headroom. */
const PUBLIC_REQUESTS_PER_MINUTE = 120;

/** Per client address; relaxed only for E2E runs (security/rate-limits.ts). */
export function publicRateLimit(env: AppEnv) {
  return routeRateLimit(env, PUBLIC_REQUESTS_PER_MINUTE, "1 minute");
}
