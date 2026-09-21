import type { AppEnv } from "@tfm-bic/config";

/** Reads (list, open) cost a couple of calls per exercise; this leaves ample headroom for a student working through a lesson. */
const READS_PER_MINUTE = 120;

/** Every accepted answer is a stored row, so submissions get their own, tighter bound: a
 * real student answers a few times a minute at most, and a script could otherwise
 * insert attempts without limit. */
const ANSWERS_PER_MINUTE = 60;

/** Same E2E-only relaxation as the auth, catalog and lesson routes (see auth.route.ts and
 * packages/config): a full Playwright run shares one server and one client address. The
 * strict limits are still exercised by the route tests. */
const E2E_RATE_LIMIT_MULTIPLIER = 100;

function limit(env: AppEnv, perMinute: number) {
  return {
    max: env.E2E_RELAXED_RATE_LIMITS ? perMinute * E2E_RATE_LIMIT_MULTIPLIER : perMinute,
    timeWindow: "1 minute",
  };
}

export const exerciseReadRateLimit = (env: AppEnv) => limit(env, READS_PER_MINUTE);
export const exerciseAnswerRateLimit = (env: AppEnv) => limit(env, ANSWERS_PER_MINUTE);
