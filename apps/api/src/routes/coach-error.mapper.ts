import {
  CoachBusyError,
  CoachConfigurationError,
  CoachProviderRateLimitedError,
  CoachProviderRejectedError,
  CoachProviderUnavailableError,
  CoachResponseError,
  CoachTimeoutError,
  CoachUnavailableError,
} from "@tfm-bic/application";
import { InvalidCoachMessageError } from "@tfm-bic/domain";

import type { MappedCatalogError } from "./catalog-error.mapper.js";

export interface MappedCoachError extends MappedCatalogError {
  /** Seconds, for a `Retry-After` header — set only when trying again later can help. */
  retryAfterSeconds?: number;
}

/**
 * Translates what the coach throws into a safe HTTP response (M23, ADR-034, decision 10).
 *
 * Two product rules shape every message here:
 *
 * 1. **Nothing about the provider reaches the learner.** No model name, no Gemini status, no
 *    quota detail, no key problem — a misconfiguration is deliberately indistinguishable from an
 *    outage, exactly as M12 treats audio.
 * 2. **Every failure says the rest of the application still works.** The coach is an enhancement;
 *    a learner who cannot reach it must not think their lessons are broken.
 *
 * Anything unrecognised is rethrown for Fastify's central handler (generic 500, logged).
 */
const UNAVAILABLE =
  "The AI Coach is temporarily unavailable. Your lessons, exercises and vocabulary all work normally.";

const RETRY_AFTER_SECONDS = 30;

export function mapCoachError(error: unknown): MappedCoachError {
  if (error instanceof InvalidCoachMessageError) {
    return {
      statusCode: 422,
      body: {
        error:
          error.reason === "too_long"
            ? "That message is too long. Please ask something shorter."
            : "That message cannot be sent to the AI Coach.",
      },
    };
  }
  if (error instanceof CoachUnavailableError) {
    return {
      statusCode: 503,
      body: {
        error:
          "The AI Coach is not enabled here. Your lessons, exercises and vocabulary all work normally.",
      },
    };
  }
  if (error instanceof CoachBusyError) {
    return {
      statusCode: 503,
      body: { error: "The AI Coach is busy right now. Please try again in a moment." },
      retryAfterSeconds: 5,
    };
  }
  if (
    error instanceof CoachProviderUnavailableError ||
    error instanceof CoachProviderRateLimitedError ||
    error instanceof CoachConfigurationError
  ) {
    return {
      statusCode: 503,
      body: { error: UNAVAILABLE },
      retryAfterSeconds: RETRY_AFTER_SECONDS,
    };
  }
  if (error instanceof CoachProviderRejectedError || error instanceof CoachResponseError) {
    return {
      statusCode: 502,
      body: { error: "The AI Coach could not answer that. Please try rephrasing your question." },
    };
  }
  if (error instanceof CoachTimeoutError) {
    return {
      statusCode: 504,
      body: { error: "The AI Coach took too long to answer. Please try again." },
    };
  }
  throw error;
}
