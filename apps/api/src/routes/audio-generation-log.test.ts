import { AudioProviderUnavailableError } from "@tfm-bic/application";
import { describe, expect, it } from "vitest";

import { audioGenerationFailureLog, audioGenerationSuccessLog } from "./audio-generation-log.js";

const base = {
  generationId: "gen-1",
  source: { type: "vocabulary-item" as const, vocabularyItemId: "pl-dom", part: "lemma" as const },
  voice: "slow" as const,
  durationMs: 12,
};

describe("audio generation log fields", () => {
  it("records what an operator needs on success — never the spoken text or the audio", () => {
    const fields = audioGenerationSuccessLog({
      ...base,
      result: {
        cached: false,
        audio: {
          data: new Uint8Array(10),
          format: "audio/wav",
          provider: "gemini",
          model: "gemini-3.8-flash-tts",
        },
      },
    });

    expect(fields).toEqual({
      audioGeneration: {
        generationId: "gen-1",
        status: "succeeded",
        sourceType: "vocabulary-item",
        contentId: "pl-dom",
        part: "lemma",
        voice: "slow",
        provider: "gemini",
        model: "gemini-3.8-flash-tts",
        cached: false,
        bytes: 10,
        durationMs: 12,
      },
    });
  });

  it("records a safe failure category — never the provider's error message", () => {
    const fields = audioGenerationFailureLog({
      ...base,
      error: new AudioProviderUnavailableError("raw upstream detail"),
    });

    expect(fields.audioGeneration).toMatchObject({
      status: "failed",
      failureCategory: "provider_unavailable",
    });
    expect(JSON.stringify(fields)).not.toContain("raw upstream detail");
  });
});
