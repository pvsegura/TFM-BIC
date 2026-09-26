import type { AppEnv } from "@tfm-bic/config";

import { routeRateLimit } from "../security/rate-limits.js";

/** A teacher paging, filtering and opening students stays far below this; a script scraping
 * rosters would not. Same order as the student-facing read routes (gamification). */
const READS_PER_MINUTE = 120;

/** Per client address; relaxed only for E2E runs (security/rate-limits.ts). */
export function teacherDashboardRateLimit(env: AppEnv) {
  return routeRateLimit(env, READS_PER_MINUTE, "1 minute");
}
