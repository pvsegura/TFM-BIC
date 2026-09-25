import { InvalidSpeechTextError } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import {
  AudioGenerationBusyError,
  AudioGenerationTimeoutError,
  AudioProviderConfigurationError,
  AudioProviderRateLimitedError,
  AudioProviderRejectedError,
  AudioProviderUnavailableError,
  categorizeAudioGenerationError,
} from "./audio-generation-errors.js";

describe("categorizeAudioGenerationError", () => {
  it.each([
    [new AudioProviderRejectedError("x"), "provider_rejected"],
    [new AudioProviderUnavailableError("x"), "provider_unavailable"],
    [new AudioProviderRateLimitedError(), "provider_rate_limited"],
    [new AudioProviderConfigurationError("x"), "provider_configuration"],
    [new AudioGenerationTimeoutError(1000), "timeout"],
    [new AudioGenerationBusyError(), "busy"],
    [new InvalidSpeechTextError("too_long"), "invalid_text"],
    [new Error("anything else"), "unknown"],
    ["not even an error", "unknown"],
  ])("maps %s to a fixed, safe category", (error, category) => {
    expect(categorizeAudioGenerationError(error)).toBe(category);
  });

  it("gives every error a distinct name, for logs", () => {
    const names = [
      new AudioProviderRejectedError("x"),
      new AudioProviderUnavailableError("x"),
      new AudioProviderRateLimitedError(),
      new AudioProviderConfigurationError("x"),
      new AudioGenerationTimeoutError(1),
      new AudioGenerationBusyError(),
    ].map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
