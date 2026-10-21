import {
  AudioProviderRateLimitedError,
  EmailDeliveryError,
  type AudioGenerationRequest,
  type AudioGenerationService,
  type OutgoingEmail,
} from "@tfm-bic/application";
import { describe, expect, it, vi } from "vitest";

import { instrumentAudioProvider, instrumentEmailProvider } from "./instrumented-providers.js";
import { MetricsRegistry } from "./metrics.js";

const AUDIO_REQUEST: AudioGenerationRequest = {
  text: "Dzień dobry — private words",
  languageId: "pl" as never,
  locale: "pl-PL",
  voice: "neutral" as never,
};

const EMAIL: OutgoingEmail = {
  to: "student@example.com",
  from: "no-reply@example.invalid",
  replyTo: null,
  subject: "Reset your password",
  html: "<a href='https://x/reset?token=reset-token-1'>reset</a>",
  text: "https://x/reset?token=reset-token-1",
  category: "transactional",
  template: "password-reset",
  listUnsubscribeUrl: null,
};

function calls(metrics: MetricsRegistry) {
  return metrics.snapshot().counters.filter((c) => c.name === "provider_calls_total");
}

describe("instrumentAudioProvider (Gemini)", () => {
  it("counts a success and its latency, and returns the provider's result unchanged", async () => {
    const metrics = new MetricsRegistry();
    const audio = {
      data: new Uint8Array([1]),
      format: "audio/wav",
      provider: "gemini",
      model: "m",
    };
    const inner: AudioGenerationService = { generate: vi.fn().mockResolvedValue(audio) };

    await expect(
      instrumentAudioProvider(inner, "gemini", metrics).generate(AUDIO_REQUEST),
    ).resolves.toBe(audio);

    expect(calls(metrics)).toEqual([
      {
        name: "provider_calls_total",
        labels: { category: "none", operation: "audio", outcome: "success", provider: "gemini" },
        value: 1,
      },
    ]);
    expect(metrics.snapshot().histograms[0]).toMatchObject({
      name: "provider_call_duration_ms",
      labels: { operation: "audio", outcome: "success", provider: "gemini" },
      count: 1,
    });
  });

  it("counts a failure by its bounded category and rethrows the same error", async () => {
    const metrics = new MetricsRegistry();
    const error = new AudioProviderRateLimitedError();
    const inner: AudioGenerationService = { generate: vi.fn().mockRejectedValue(error) };

    await expect(
      instrumentAudioProvider(inner, "gemini", metrics).generate(AUDIO_REQUEST),
    ).rejects.toBe(error);

    expect(calls(metrics)[0]?.labels).toEqual({
      category: "provider_rate_limited",
      operation: "audio",
      outcome: "failure",
      provider: "gemini",
    });
    expect(JSON.stringify(metrics.snapshot())).not.toContain("private words");
  });
});

describe("instrumentEmailProvider", () => {
  it("keeps the adapter name and counts accepted and failed sends — no recipient, subject or link", async () => {
    const metrics = new MetricsRegistry();
    const send = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(
        new EmailDeliveryError({ cause: new Error("provider said no to student@example.com") }),
      )
      .mockRejectedValueOnce(new Error("socket hang up"));
    const provider = instrumentEmailProvider({ name: "fake", send }, metrics);

    expect(provider.name).toBe("fake");
    await provider.send(EMAIL);
    await expect(provider.send(EMAIL)).rejects.toBeInstanceOf(EmailDeliveryError);
    await expect(provider.send(EMAIL)).rejects.toThrow("socket hang up");

    expect(calls(metrics).map((c) => [c.labels.outcome, c.labels.category, c.value])).toEqual([
      ["success", "none", 1],
      ["failure", "provider_error", 1],
      ["failure", "unknown", 1],
    ]);
    const snapshot = JSON.stringify(metrics.snapshot());
    for (const leaked of ["student@example.com", "Reset your password", "reset-token-1"]) {
      expect(snapshot).not.toContain(leaked);
    }
  });
});
