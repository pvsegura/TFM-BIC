import {
  AudioGenerationTimeoutError,
  AudioProviderConfigurationError,
  AudioProviderRateLimitedError,
  AudioProviderRejectedError,
  AudioProviderUnavailableError,
  type AudioGenerationRequest,
  type AudioGenerationService,
  type GeneratedAudio,
} from "@tfm-bic/application";

import {
  geminiBackoffMs,
  geminiRetryAfterMs,
  GEMINI_RETRYABLE_STATUSES,
  isGeminiTimeout,
  postGeminiInteraction,
  translateGeminiStatus,
} from "../providers/gemini/gemini-interactions.js";
import { isWav } from "./wav.js";

/**
 * Gemini text-to-speech adapter (M12, ADR-013) — the only file that knows how Gemini *speaks*.
 *
 * Verified against the official docs on 2026-09-25 (ai.google.dev/gemini-api/docs/speech-generation,
 * .../docs/interactions, .../docs/api-errors): TTS goes through the GA Interactions API,
 * `POST https://generativelanguage.googleapis.com/v1beta/interactions`, authenticated with the
 * `x-goog-api-key` header. A unary request returns the whole clip inline, base64-encoded, as
 * `audio/wav` (24 kHz, mono, 16-bit PCM) in `steps[].content[]` (`type: "audio"`). The model
 * detects the input language itself; there is no language parameter.
 *
 * Plain `fetch` against the documented REST endpoint instead of the `@google/genai` SDK: one
 * request shape is all this needs, and owning it keeps timeout/retry behaviour explicit and adds
 * no dependency (see ADR-013). Never executed against the real API in this repository's tests.
 *
 * M23: the endpoint, the retry policy and the HTTP classification moved to
 * `providers/gemini/gemini-interactions.ts`, now shared with the AI Coach adapter (ADR-034). The
 * request body, the response reading and every error type raised here are unchanged — this adapter
 * still owns everything specific to speech, and the offline media pipeline's behaviour is identical.
 */
export { GEMINI_INTERACTIONS_URL } from "../providers/gemini/gemini-interactions.js";

/** A documented prebuilt voice. Profiles differ by delivery style, not by voice. */
export const DEFAULT_GEMINI_VOICE = "Kore";

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_RETRIES = 2;

export interface GeminiAudioProviderOptions {
  apiKey: string;
  model: string;
  voiceName?: string;
  /**
   * A narrator's fixed delivery instruction (M21), appended to every request's style so all clips
   * of one lesson share voice, model *and* style. Operator configuration, never content or input.
   */
  narratorStyle?: string;
  timeoutMs?: number;
  maxRetries?: number;
  /** Injected in tests only. */
  fetch?: typeof fetch;
  /** Injected in tests only. */
  sleep?: (ms: number) => Promise<void>;
}

/**
 * The delivery instruction sent in the style annotation — written by us, never from content or
 * the client. The language name comes from the catalog's locale via `Intl`, so no language is
 * hard-coded; it is a hint only (the model detects the language itself), and it is omitted when
 * the locale has no known name.
 */
export function speechStyleFor(request: AudioGenerationRequest): string {
  const language = languageNameOf(request.locale);
  const prefix = language ? `Read aloud in ${language}, ` : "Read aloud ";
  return request.voice === "slow"
    ? `${prefix}slowly and very clearly, for a language learner.`
    : `${prefix}clearly and at a natural pace.`;
}

function languageNameOf(locale: string): string | null {
  try {
    const languageTag = new Intl.Locale(locale).language;
    const name = new Intl.DisplayNames(["en"], { type: "language", fallback: "none" }).of(
      languageTag,
    );
    return name && name !== languageTag ? name : null;
  } catch {
    return null;
  }
}

/**
 * The documented Interactions request for single-speaker TTS. The educational text and our own
 * style instruction are separate fields, so the text is only ever spoken, never treated as an
 * instruction. `store: false` asks Gemini not to keep the interaction server-side (documented
 * opt-out of its default storage). Nothing about the student is included.
 */
export function buildGeminiSpeechRequestBody(
  request: AudioGenerationRequest,
  config: { model: string; voiceName: string; narratorStyle?: string | undefined },
) {
  const style = config.narratorStyle
    ? `${speechStyleFor(request)} ${config.narratorStyle}`
    : speechStyleFor(request);
  return {
    model: config.model,
    input: [
      {
        type: "user_input",
        content: [
          {
            type: "text",
            text: request.text,
            annotations: [{ type: "speech_metadata", style }],
          },
        ],
      },
    ],
    response_format: { type: "audio" },
    generation_config: { speech_config: [{ voice: config.voiceName }] },
    store: false,
  };
}

interface AudioPart {
  data: string;
  mimeType: string | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** The last audio item of the model's output steps, or the SDK-style `output_audio`. */
function extractAudio(body: unknown): AudioPart | null {
  if (!isRecord(body)) return null;

  let found: AudioPart | null = null;
  const steps = Array.isArray(body.steps) ? body.steps : [];
  for (const step of steps) {
    if (!isRecord(step) || step.type !== "model_output" || !Array.isArray(step.content)) continue;
    for (const item of step.content) {
      if (isRecord(item) && item.type === "audio" && typeof item.data === "string") {
        found = {
          data: item.data,
          mimeType: typeof item.mime_type === "string" ? item.mime_type : undefined,
        };
      }
    }
  }
  if (found) return found;

  const output = body.output_audio;
  if (isRecord(output) && typeof output.data === "string") {
    return {
      data: output.data,
      mimeType: typeof output.mime_type === "string" ? output.mime_type : undefined,
    };
  }
  return null;
}

/**
 * An HTTP failure in *audio's* error vocabulary. The classification itself is the shared one
 * (`translateGeminiStatus`), so TTS and the coach agree on what a 403 or a 503 means; only the
 * error types differ, because an audio failure and a coaching failure are handled differently.
 * The response body is never read into the message.
 */
function translateStatus(status: number): Error {
  return translateGeminiStatus(status, {
    configuration: (detail) => new AudioProviderConfigurationError(detail),
    rejected: (detail) => new AudioProviderRejectedError(detail),
    unavailable: (detail) => new AudioProviderUnavailableError(detail),
    rateLimited: () => new AudioProviderRateLimitedError(),
  });
}

type Attempt =
  { kind: "done"; audio: GeneratedAudio } | { kind: "retry"; error: Error; delayMs: number | null };

export class GeminiAudioProvider implements AudioGenerationService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly voiceName: string;
  private readonly narratorStyle: string | undefined;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchFn: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: GeminiAudioProviderOptions) {
    if (options.apiKey.trim() === "") {
      throw new AudioProviderConfigurationError("no API key configured");
    }
    if (options.model.trim() === "") {
      throw new AudioProviderConfigurationError("no model configured");
    }
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.voiceName = options.voiceName ?? DEFAULT_GEMINI_VOICE;
    this.narratorStyle = options.narratorStyle;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.fetchFn = options.fetch ?? fetch;
    this.sleep =
      options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms).unref()));
  }

  /**
   * One attempt, plus at most `maxRetries` more for documented-transient failures (429, 500, 503,
   * 504, network errors), with exponential backoff (500 ms, 1 s, ... capped at 8 s; `Retry-After`
   * honoured within that cap). Never retried: our own timeout (the abandoned call may still be
   * billed), and every other 4xx (retrying cannot fix them).
   */
  async generate(request: AudioGenerationRequest): Promise<GeneratedAudio> {
    const body = JSON.stringify(
      buildGeminiSpeechRequestBody(request, {
        model: this.model,
        voiceName: this.voiceName,
        narratorStyle: this.narratorStyle,
      }),
    );

    for (let attempt = 0; ; attempt += 1) {
      const outcome = await this.attempt(body);
      if (outcome.kind === "done") {
        return outcome.audio;
      }
      if (attempt >= this.maxRetries) {
        throw outcome.error;
      }
      await this.sleep(geminiBackoffMs(attempt, outcome.delayMs));
    }
  }

  private async attempt(body: string): Promise<Attempt> {
    let response: Response;
    let payload: unknown;
    try {
      response = await postGeminiInteraction(body, {
        apiKey: this.apiKey,
        timeoutMs: this.timeoutMs,
        fetch: this.fetchFn,
      });
      if (!response.ok) {
        if (GEMINI_RETRYABLE_STATUSES.has(response.status)) {
          return {
            kind: "retry",
            error: translateStatus(response.status),
            delayMs: geminiRetryAfterMs(response),
          };
        }
        throw translateStatus(response.status);
      }
      payload = await response.json().catch(() => {
        throw new AudioProviderUnavailableError("unreadable response body");
      });
    } catch (error) {
      if (isGeminiTimeout(error)) {
        throw new AudioGenerationTimeoutError(this.timeoutMs);
      }
      if (error instanceof TypeError) {
        return {
          kind: "retry",
          error: new AudioProviderUnavailableError("network error"),
          delayMs: null,
        };
      }
      throw error;
    }

    return { kind: "done", audio: this.toGeneratedAudio(payload) };
  }

  private toGeneratedAudio(payload: unknown): GeneratedAudio {
    const audio = extractAudio(payload);
    if (!audio) {
      throw new AudioProviderRejectedError("no audio in the response");
    }
    if (audio.mimeType !== undefined && audio.mimeType !== "audio/wav") {
      throw new AudioProviderRejectedError("unexpected audio format");
    }
    const data = new Uint8Array(Buffer.from(audio.data, "base64"));
    if (!isWav(data)) {
      throw new AudioProviderRejectedError("response audio is not a WAV file");
    }
    return { data, format: "audio/wav", provider: "gemini", model: this.model };
  }
}
