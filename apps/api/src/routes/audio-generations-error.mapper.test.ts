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
import { describe, expect, it } from "vitest";

import { mapAudioGenerationError } from "./audio-generations-error.mapper.js";

describe("mapAudioGenerationError", () => {
  it.each([
    [new VocabularyItemNotFoundError("pl-x"), 404],
    [new AudioSourceTextMissingError("example"), 404],
    [new AudioLanguageUnavailableError("zz"), 404],
    [new InvalidSpeechTextError("too_long"), 422],
    [new InvalidSpeechTextError("empty"), 422],
    [new AudioProviderRejectedError("x"), 502],
    [new AudioProviderUnavailableError("x"), 503],
    [new AudioProviderRateLimitedError(), 503],
    [new AudioProviderConfigurationError("bad key"), 503],
    [new AudioGenerationBusyError(), 503],
    [new AudioGenerationTimeoutError(1000), 504],
  ])("maps %s to %i", (error, statusCode) => {
    expect(mapAudioGenerationError(error).statusCode).toBe(statusCode);
  });

  it("never reveals that the server is misconfigured — it looks like any outage", () => {
    const mapped = mapAudioGenerationError(new AudioProviderConfigurationError("bad key"));

    expect(mapped.body).toEqual({ error: "Audio generation is temporarily unavailable." });
  });

  it("uses a distinct message when the text is empty or unusable rather than too long", () => {
    expect(mapAudioGenerationError(new InvalidSpeechTextError("empty")).body).toEqual({
      error: "This text cannot be converted to audio.",
    });
  });

  it("rethrows anything it does not recognise, for the central 500 handler", () => {
    const unknown = new Error("boom");
    expect(() => mapAudioGenerationError(unknown)).toThrow(unknown);
  });
});
