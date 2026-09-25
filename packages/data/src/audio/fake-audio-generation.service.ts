import {
  AudioGenerationTimeoutError,
  AudioProviderRateLimitedError,
  AudioProviderRejectedError,
  AudioProviderUnavailableError,
  type AudioGenerationRequest,
  type AudioGenerationService,
  type GeneratedAudio,
} from "@tfm-bic/application";

import { encodeWavPcm16 } from "./wav.js";

export const FAKE_AUDIO_GENERATION_SCENARIOS = [
  "success",
  "provider-rejected",
  "provider-unavailable",
  "rate-limited",
  "timeout",
] as const;
export type FakeAudioGenerationScenario = (typeof FAKE_AUDIO_GENERATION_SCENARIOS)[number];

const SAMPLE_RATE = 24000;
const DURATION_SECONDS = 0.25;
const TONE_HZ = 440;
const AMPLITUDE = 3000;

/** A quarter-second, quiet 440 Hz tone — deterministic, tiny (~12 KB), and playable in any browser. */
function makeToneClip(): Uint8Array {
  const samples = new Int16Array(Math.round(SAMPLE_RATE * DURATION_SECONDS));
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = Math.round(AMPLITUDE * Math.sin((2 * Math.PI * TONE_HZ * i) / SAMPLE_RATE));
  }
  return encodeWavPcm16(samples, SAMPLE_RATE);
}

const TONE_CLIP = makeToneClip();

/**
 * The `AudioGenerationService` wired by default (ADR-013): development, tests, CI and Playwright
 * never need a Gemini key, network access or a paid call. It never generates speech — every
 * successful request gets the same short tone, in the same WAV format the real provider returns,
 * so the browser's `<audio>` element really plays it.
 *
 * Deterministic: a text's outcome is decided by the scenario map given at construction, never by
 * chance; a text with no mapping succeeds.
 */
export class FakeAudioGenerationService implements AudioGenerationService {
  readonly calls: AudioGenerationRequest[] = [];

  constructor(
    private readonly scenarios: ReadonlyMap<string, FakeAudioGenerationScenario> = new Map(),
  ) {}

  generate(request: AudioGenerationRequest): Promise<GeneratedAudio> {
    this.calls.push(request);
    const scenario = this.scenarios.get(request.text) ?? "success";

    switch (scenario) {
      case "success":
        return Promise.resolve({
          data: TONE_CLIP.slice(),
          format: "audio/wav",
          provider: "fake",
          model: null,
        });
      case "provider-rejected":
        return Promise.reject(new AudioProviderRejectedError("fake scenario"));
      case "provider-unavailable":
        return Promise.reject(new AudioProviderUnavailableError("fake scenario"));
      case "rate-limited":
        return Promise.reject(new AudioProviderRateLimitedError());
      case "timeout":
        return Promise.reject(new AudioGenerationTimeoutError(0));
    }
  }
}
