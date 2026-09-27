import {
  AudioProviderUnavailableError,
  VideoProviderUnavailableError,
  type AudioGenerationService,
  type GeneratedAudio,
  type VideoGenerationResult,
  type VideoGenerationService,
} from "@tfm-bic/application";

/**
 * The adapters behind `AUDIO_GENERATION_PROVIDER=disabled` / `VIDEO_GENERATION_PROVIDER=disabled`
 * (M17, ADR-028): the feature is switched off in this deployment. The routes already answer 503
 * before reaching a use case; these exist so the composition never falls back to a fake adapter,
 * and so any other path that did reach a provider fails as "unavailable" instead of producing
 * something that looks real.
 */
export class DisabledAudioGenerationService implements AudioGenerationService {
  generate(): Promise<GeneratedAudio> {
    return Promise.reject(new AudioProviderUnavailableError("disabled in this deployment"));
  }
}

export class DisabledVideoGenerationService implements VideoGenerationService {
  generate(): Promise<VideoGenerationResult> {
    return Promise.reject(new VideoProviderUnavailableError("disabled in this deployment"));
  }
}
