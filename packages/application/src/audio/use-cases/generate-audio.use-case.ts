import {
  createSpeechRequest,
  speechRequestKey,
  type LanguageId,
  type VoiceProfile,
} from "@tfm-bic/domain";

import type { ContentRepository } from "../../content/ports/content-repository.js";
import {
  AudioGenerationBusyError,
  AudioLanguageUnavailableError,
} from "../errors/audio-generation-errors.js";
import type { AudioCache } from "../ports/audio-cache.js";
import type { AudioGenerationService, GeneratedAudio } from "../ports/audio-generation-service.js";

export interface GenerateAudioInput {
  /** Educational text chosen by application code (e.g. a vocabulary entry) — never client input. */
  text: string;
  languageId: LanguageId;
  voice: VoiceProfile;
}

export interface GenerateAudioResult {
  audio: GeneratedAudio;
  /** `true` when the clip was reused instead of generated — nothing was sent to the provider. */
  cached: boolean;
}

export interface GenerateAudioOptions {
  /** Configured text limit, in characters; the domain caps it at `SPEECH_TEXT_MAX_LENGTH`. */
  maxTextLength: number;
  /** How many distinct generations this process runs at once; beyond it a request is refused. */
  maxConcurrent: number;
}

/**
 * The reusable audio capability (M12): turns educational text into speech through whichever
 * `AudioGenerationService` is configured. Future consumers (phonetics, lesson narration, video
 * narration) build on this use case, not on a provider.
 *
 * Cost controls, all in-process (ADR-013 — no Redis, no queue):
 * - identical requests (same `speechRequestKey`) are served from the `AudioCache`;
 * - identical requests already in flight share one provider call;
 * - at most `maxConcurrent` distinct provider calls run at once — beyond that, a fast
 *   `AudioGenerationBusyError` instead of queueing unbounded work.
 * Failures are never cached.
 */
export class GenerateAudioUseCase {
  private readonly inFlight = new Map<string, Promise<GeneratedAudio>>();

  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly provider: AudioGenerationService,
    private readonly cache: AudioCache,
    private readonly options: GenerateAudioOptions,
  ) {}

  async execute(input: GenerateAudioInput): Promise<GenerateAudioResult> {
    const request = createSpeechRequest(input, this.options.maxTextLength);

    const language = await this.contentRepository.findLanguage(request.languageId);
    if (!language?.isActive) {
      throw new AudioLanguageUnavailableError(request.languageId);
    }

    const key = speechRequestKey(request);
    const cachedAudio = this.cache.get(key);
    if (cachedAudio) {
      return { audio: cachedAudio, cached: true };
    }

    const running = this.inFlight.get(key);
    if (running) {
      return { audio: await running, cached: false };
    }

    if (this.inFlight.size >= this.options.maxConcurrent) {
      throw new AudioGenerationBusyError();
    }

    const generation = this.provider
      .generate({
        text: request.text,
        languageId: request.languageId,
        locale: language.locale,
        voice: request.voice,
      })
      .then((audio) => {
        this.cache.set(key, audio);
        return audio;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });
    this.inFlight.set(key, generation);

    return { audio: await generation, cached: false };
  }
}
