import { loadEnv } from "@tfm-bic/config";
import { FakeAudioGenerationService, GeminiAudioProvider } from "@tfm-bic/data";
import { describe, expect, it } from "vitest";

import { createAudioDependencies, selectAudioGenerationProvider } from "./audio-dependencies.js";

const dev = { NODE_ENV: "development", DATABASE_URL: "postgres://u:p@localhost:5432/db" };

describe("selectAudioGenerationProvider", () => {
  it("selects the fake adapter by default — no key, no network", () => {
    expect(selectAudioGenerationProvider(loadEnv(dev))).toBeInstanceOf(FakeAudioGenerationService);
    expect(selectAudioGenerationProvider(loadEnv({ NODE_ENV: "test" }))).toBeInstanceOf(
      FakeAudioGenerationService,
    );
  });

  it("selects Gemini only when explicitly configured with a key (constructing it calls nothing)", () => {
    const env = loadEnv({ ...dev, AUDIO_GENERATION_PROVIDER: "gemini", GEMINI_API_KEY: "k" });

    expect(selectAudioGenerationProvider(env)).toBeInstanceOf(GeminiAudioProvider);
  });
});

describe("createAudioDependencies", () => {
  it("applies the configured text limit and a bounded concurrency", () => {
    const deps = createAudioDependencies(
      loadEnv({ ...dev, AUDIO_GENERATION_MAX_TEXT_LENGTH: "120" }),
    );

    expect(deps.options.maxTextLength).toBe(120);
    expect(deps.options.maxConcurrent).toBeGreaterThan(0);
    expect(deps.cache.get("anything")).toBeUndefined();
  });
});
