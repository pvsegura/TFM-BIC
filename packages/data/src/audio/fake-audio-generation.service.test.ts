import {
  AudioGenerationTimeoutError,
  AudioProviderRateLimitedError,
  AudioProviderRejectedError,
  AudioProviderUnavailableError,
} from "@tfm-bic/application";
import { createLanguageId } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { FakeAudioGenerationService } from "./fake-audio-generation.service.js";
import { isWav } from "./wav.js";

const request = (text: string) => ({
  text,
  languageId: createLanguageId("pl"),
  locale: "pl-PL",
  voice: "standard" as const,
});

describe("FakeAudioGenerationService", () => {
  it("returns a small, real, playable WAV clip labelled as the fake provider", async () => {
    const audio = await new FakeAudioGenerationService().generate(request("dom"));

    expect(audio.format).toBe("audio/wav");
    expect(isWav(audio.data)).toBe(true);
    expect(audio.data.byteLength).toBeLessThan(64 * 1024);
    expect(audio.provider).toBe("fake");
    expect(audio.model).toBeNull();
  });

  it("is deterministic: the same request always yields the same bytes", async () => {
    const fake = new FakeAudioGenerationService();
    const a = await fake.generate(request("dom"));
    const b = await fake.generate(request("dom"));

    expect(a.data).toEqual(b.data);
  });

  it("records every request, so tests can prove what would have been sent", async () => {
    const fake = new FakeAudioGenerationService();
    await fake.generate(request("dom"));

    expect(fake.calls).toEqual([request("dom")]);
  });

  it.each([
    ["provider-rejected", AudioProviderRejectedError],
    ["provider-unavailable", AudioProviderUnavailableError],
    ["rate-limited", AudioProviderRateLimitedError],
    ["timeout", AudioGenerationTimeoutError],
  ] as const)("fails with the %s scenario configured for a text", async (scenario, errorType) => {
    const fake = new FakeAudioGenerationService(new Map([["zepsuty", scenario]]));

    await expect(fake.generate(request("zepsuty"))).rejects.toThrow(errorType);
    await expect(fake.generate(request("dom"))).resolves.toBeDefined();
  });
});
