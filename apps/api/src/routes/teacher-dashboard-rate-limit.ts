import type { AppEnv } from "@tfm-bic/config";

/** A teacher paging, filtering and opening students stays far below this; a script scraping
 * rosters would not. Same order as the student-facing read routes (gamification). */
const READS_PER_MINUTE = 120;

/** Same E2E-only relaxation as every other route (see gamification-rate-limit.ts). The strict
 * limit is still exercised by the route tests. */
const E2E_RATE_LIMIT_MULTIPLIER = 100;

export function teacherDashboardRateLimit(env: AppEnv) {
  return {
    max: env.E2E_RELAXED_RATE_LIMITS
      ? READS_PER_MINUTE * E2E_RATE_LIMIT_MULTIPLIER
      : READS_PER_MINUTE,
    timeWindow: "1 minute",
  };
}
