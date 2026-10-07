import type { AppEnv } from "@tfm-bic/config";
import type { FastifyInstance } from "fastify";

import { perUserRateLimit, routeRateLimit } from "../security/rate-limits.js";

/**
 * The AI Coach's limits (M23, ADR-034, decision 9). This is the one route in the product where a
 * single request costs the project money and burns a shared daily provider quota, so it gets the
 * layered treatment M16 reserves for expensive routes: a per-user limit *and* a per-address one.
 *
 * - **Per user** is the real cost control: it cannot be escaped by changing address, and a session
 *   is needed to reach the route at all. Twenty messages an hour is a long coaching conversation;
 *   a learner who hits it is looping, and the project's key has been seeing a daily cap of roughly
 *   100 provider requests in practice (M21/M22), which one learner must not be able to exhaust.
 * - **Per address** catches the case before a session exists or across several accounts from one
 *   place.
 *
 * Both are deliberately well below the provider's own quota, so a learner meets *our* limit (a
 * clear message, nothing billed) rather than Gemini's.
 */
const MESSAGES_PER_USER_PER_HOUR = 20;
const MESSAGES_PER_ADDRESS_PER_HOUR = 30;

/** The status check is free — it reads one boolean — so it only needs a loose address limit. */
const STATUS_READS_PER_MINUTE = 60;

export const coachMessageAddressRateLimit = (env: AppEnv) =>
  routeRateLimit(env, MESSAGES_PER_ADDRESS_PER_HOUR, "1 hour");

export const coachStatusRateLimit = (env: AppEnv) =>
  routeRateLimit(env, STATUS_READS_PER_MINUTE, "1 minute");

/** Runs after `authenticate`, so `request.currentUser` is set and the key is the learner's id. */
export const coachMessageUserRateLimit = (app: FastifyInstance, env: AppEnv) =>
  perUserRateLimit(app, env, "ai-coach", {
    max: MESSAGES_PER_USER_PER_HOUR,
    timeWindow: "1 hour",
  });
