import {
  AudioGenerationBusyError,
  AudioGenerationTimeoutError,
  AudioLanguageUnavailableError,
  AudioProviderConfigurationError,
  AudioProviderRateLimitedError,
  AudioProviderRejectedError,
  AudioProviderUnavailableError,
  AudioSourceTextMissingError,
} from "@tfm-bic/application";
import { InvalidSpeechTextError, VocabularyItemNotFoundError } from "@tfm-bic/domain";

import type { MappedCatalogError } from "./catalog-error.mapper.js";

export interface MappedAudioGenerationError extends MappedCatalogError {
  /** Seconds, for a `Retry-After` header — set only when trying again later can help. */
  retryAfterSeconds?: number;
}

const UNAVAILABLE = "Audio generation is temporarily unavailable.";
const RETRY_AFTER_SECONDS = 30;

/**
 * Translates what the audio use cases throw into a safe HTTP response: a fixed message, never the
 * requested id, the text, or anything the provider said (see docs/security/security-baseline.md).
 *
 * - Content the student cannot hear (missing, hidden, no example, inactive language) is one `404`.
 * - Content text beyond the configured limit is `422` — the request was valid, the content is not
 *   speakable under this deployment's limits.
 * - Provider failures are `502` (refused this text), `503` (unavailable, rate-limited, busy — or
 *   misconfigured, deliberately indistinguishable from an outage) and `504` (timed out).
 * Anything unrecognised is rethrown for Fastify's central handler (generic 500, logged).
 */
export function mapAudioGenerationError(error: unknown): MappedAudioGenerationError {
  if (
    error instanceof VocabularyItemNotFoundError ||
    error instanceof AudioSourceTextMissingError ||
    error instanceof AudioLanguageUnavailableError
  ) {
    return { statusCode: 404, body: { error: "Audio source not found." } };
  }
  if (error instanceof InvalidSpeechTextError) {
    return {
      statusCode: 422,
      body: {
        error:
          error.reason === "too_long"
            ? "This text is too long to convert to audio."
            : "This text cannot be converted to audio.",
      },
    };
  }
  if (error instanceof AudioProviderRejectedError) {
    return { statusCode: 502, body: { error: "Audio could not be generated for this text." } };
  }
  if (
    error instanceof AudioProviderUnavailableError ||
    error instanceof AudioProviderRateLimitedError ||
    error instanceof AudioProviderConfigurationError ||
    error instanceof AudioGenerationBusyError
  ) {
    return {
      statusCode: 503,
      body: { error: UNAVAILABLE },
      retryAfterSeconds: RETRY_AFTER_SECONDS,
    };
  }
  if (error instanceof AudioGenerationTimeoutError) {
    return {
      statusCode: 504,
      body: { error: "Audio generation took too long. Please try again." },
    };
  }
  throw error;
}
