import type { AppEnv } from "@tfm-bic/config";

import { routeRateLimit } from "../security/rate-limits.js";

/** Each uncached clip is a paid provider call. A learner listening through a word list is well
 * under this; a script hammering the endpoint is not. Identical requests are served from the
 * cache, but still count here. */
const GENERATIONS_PER_HOUR = 30;

/** The same budget again per signed-in user (M16), whatever address they use. */
export const AUDIO_GENERATIONS_PER_USER = { max: GENERATIONS_PER_HOUR, timeWindow: "1 hour" };

/** Per client address; relaxed only for E2E runs (security/rate-limits.ts). */
export const audioGenerationRateLimit = (env: AppEnv) =>
  routeRateLimit(env, GENERATIONS_PER_HOUR, "1 hour");
