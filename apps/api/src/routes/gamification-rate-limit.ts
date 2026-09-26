import type { AppEnv } from "@tfm-bic/config";

import { routeRateLimit } from "../security/rate-limits.js";

/** The dashboard makes a summary request and the achievements page one more; a student
 * flipping between them stays far below this. Only a script polling would reach it. */
const READS_PER_MINUTE = 120;

/** Per client address; relaxed only for E2E runs (security/rate-limits.ts). */
export function gamificationReadRateLimit(env: AppEnv) {
  return routeRateLimit(env, READS_PER_MINUTE, "1 minute");
}
