import {
  AudioProviderUnavailableError,
  type AudioGenerationService,
  type GeneratedAudio,
} from "@tfm-bic/application";

/**
 * The adapter behind `AUDIO_GENERATION_PROVIDER=disabled` (M17, ADR-028): the feature is switched
 * off in this deployment. The route already answers 503 before reaching a use case; this exists so
 * the composition never falls back to a fake adapter, and so any other path that did reach a
 * provider fails as "unavailable" instead of producing something that looks real.
 */
export class DisabledAudioGenerationService implements AudioGenerationService {
  generate(): Promise<GeneratedAudio> {
    return Promise.reject(new AudioProviderUnavailableError("disabled in this deployment"));
  }
}
