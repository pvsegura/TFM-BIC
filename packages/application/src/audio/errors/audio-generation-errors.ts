import { InvalidSpeechTextError } from "@tfm-bic/domain";

/**
 * Audio generation failures (M12, ADR-013), in the platform's own terms. A provider adapter
 * translates every failure of its own into one of the provider errors below, so a use case or a
 * route never sees a provider SDK/HTTP error — nor its raw message, which is never copied here.
 */

/** The provider could not be reached or failed on its side (network error, 5xx, overloaded). */
export class AudioProviderUnavailableError extends Error {
  constructor(reason: string) {
    super(`The audio generation provider is unavailable: ${reason}`);
    this.name = "AudioProviderUnavailableError";
  }
}

/** The provider answered and refused this request (bad request, blocked text, no audio returned). */
export class AudioProviderRejectedError extends Error {
  constructor(reason: string) {
    super(`The audio generation provider rejected the request: ${reason}`);
    this.name = "AudioProviderRejectedError";
  }
}

/** The provider's own rate limit/quota was hit, even after the adapter's bounded retries. */
export class AudioProviderRateLimitedError extends Error {
  constructor() {
    super("The audio generation provider's rate limit was exceeded.");
    this.name = "AudioProviderRateLimitedError";
  }
}

/** The provider refused our credentials or configuration (invalid key, unknown model). Never retried. */
export class AudioProviderConfigurationError extends Error {
  constructor(reason: string) {
    super(`The audio generation provider is misconfigured: ${reason}`);
    this.name = "AudioProviderConfigurationError";
  }
}

/** The provider did not answer within the adapter's timeout. Not retried: the call may still be billed. */
export class AudioGenerationTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`The audio generation provider did not respond within ${timeoutMs}ms.`);
    this.name = "AudioGenerationTimeoutError";
  }
}

/** This server is already running as many generations as it allows at once. */
export class AudioGenerationBusyError extends Error {
  constructor() {
    super("Too many audio generations are running; try again shortly.");
    this.name = "AudioGenerationBusyError";
  }
}

/** The language is not one of the platform's active languages. */
export class AudioLanguageUnavailableError extends Error {
  constructor(languageId: string) {
    super(`Language "${languageId}" is not available for audio generation.`);
    this.name = "AudioLanguageUnavailableError";
  }
}

/** The content exists, but has no text for the requested part (e.g. an entry without an example). */
export class AudioSourceTextMissingError extends Error {
  constructor(part: string) {
    super(`The requested content has no "${part}" text to speak.`);
    this.name = "AudioSourceTextMissingError";
  }
}

export type AudioGenerationFailureCategory =
  | "invalid_text"
  | "provider_rejected"
  | "provider_unavailable"
  | "provider_rate_limited"
  | "provider_configuration"
  | "timeout"
  | "busy"
  | "unknown";

/** A fixed, safe category for logs and error responses — never the provider's own text. */
export function categorizeAudioGenerationError(error: unknown): AudioGenerationFailureCategory {
  if (error instanceof InvalidSpeechTextError) return "invalid_text";
  if (error instanceof AudioProviderRejectedError) return "provider_rejected";
  if (error instanceof AudioProviderUnavailableError) return "provider_unavailable";
  if (error instanceof AudioProviderRateLimitedError) return "provider_rate_limited";
  if (error instanceof AudioProviderConfigurationError) return "provider_configuration";
  if (error instanceof AudioGenerationTimeoutError) return "timeout";
  if (error instanceof AudioGenerationBusyError) return "busy";
  return "unknown";
}
