import type { GeneratedAudio } from "./audio-generation-service.js";

/**
 * Where already-generated clips are kept so an identical request does not pay for generation
 * twice (see `GenerateAudioUseCase`). Keyed by `speechRequestKey`. Not durable storage: an
 * implementation may evict anything at any time, and a miss only costs a new generation.
 */
export interface AudioCache {
  get(key: string): GeneratedAudio | undefined;
  set(key: string, audio: GeneratedAudio): void;
}
