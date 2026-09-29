import {
  AudioProviderRateLimitedError,
  EmailDeliveryError,
  VideoGenerationTimeoutError,
  type AudioGenerationRequest,
  type AudioGenerationService,
  type OutgoingEmail,
  type VideoGenerationService,
} from "@tfm-bic/application";
import { describe, expect, it, vi } from "vitest";

import {
  instrumentAudioProvider,
  instrumentEmailProvider,
  instrumentVideoProvider,
} from "./instrumented-providers.js";
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

describe("instrumentVideoProvider (Hyperframes)", () => {
  const request = { videoDefinitionId: "pl-greetings-video", scriptPath: "s", title: "Hello" };

  it("logs the render start and completion with duration, and counts them", async () => {
    const metrics = new MetricsRegistry();
    const log = { info: vi.fn(), warn: vi.fn() };
    const result = { providerJobReference: "job-1", mediaReference: "media-1" };
    const inner: VideoGenerationService = { generate: vi.fn().mockResolvedValue(result) };

    await expect(
      instrumentVideoProvider(inner, "hyperframes", metrics, log).generate(request),
    ).resolves.toBe(result);

    expect(log.info).toHaveBeenCalledWith(
      { provider: "hyperframes", videoDefinitionId: "pl-greetings-video" },
      "video.render_started",
    );
    expect(log.info).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "hyperframes",
        videoDefinitionId: "pl-greetings-video",
        durationMs: expect.any(Number) as number,
      }),
      "video.render_completed",
    );
    expect(calls(metrics)[0]?.labels).toMatchObject({ operation: "video", outcome: "success" });
  });

  it("logs a failed render at warn with its category only — never the provider's message", async () => {
    const metrics = new MetricsRegistry();
    const log = { info: vi.fn(), warn: vi.fn() };
    const inner: VideoGenerationService = {
      generate: vi.fn().mockRejectedValue(new VideoGenerationTimeoutError(1000)),
    };

    await expect(
      instrumentVideoProvider(inner, "hyperframes", metrics, log).generate(request),
    ).rejects.toBeInstanceOf(VideoGenerationTimeoutError);

    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ category: "timeout", videoDefinitionId: "pl-greetings-video" }),
      "video.render_failed",
    );
    expect(calls(metrics)[0]?.labels).toMatchObject({ outcome: "failure", category: "timeout" });
  });

  it("categorises an unexpected error as unknown", async () => {
    const metrics = new MetricsRegistry();
    const inner: VideoGenerationService = { generate: vi.fn().mockRejectedValue(new Error("x")) };
    await expect(
      instrumentVideoProvider(inner, "fake", metrics, { info: vi.fn(), warn: vi.fn() }).generate(
        request,
      ),
    ).rejects.toThrow("x");
    expect(calls(metrics)[0]?.labels.category).toBe("unknown");
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
