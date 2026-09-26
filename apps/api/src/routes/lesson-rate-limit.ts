import type { AppEnv } from "@tfm-bic/config";

import { routeRateLimit } from "../security/rate-limits.js";

/** Lesson routes are authenticated, but a session is not a reason to allow
 * unlimited requests: opening a lesson costs a handful of calls (list, detail,
 * start), and this leaves ample headroom for a student clicking around. */
const LESSON_REQUESTS_PER_MINUTE = 120;

/** Per client address; relaxed only for E2E runs (security/rate-limits.ts). */
export function lessonRateLimit(env: AppEnv) {
  return routeRateLimit(env, LESSON_REQUESTS_PER_MINUTE, "1 minute");
}
