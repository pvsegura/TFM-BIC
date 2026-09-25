import type {
  AudioCache,
  AudioGenerationService,
  GenerateAudioOptions,
} from "@tfm-bic/application";
import type { AppEnv } from "@tfm-bic/config";
import { FakeAudioGenerationService, GeminiAudioProvider, InMemoryAudioCache } from "@tfm-bic/data";

/**
 * Everything the audio-generation routes need beyond the content dependencies (the text comes from
 * the M5/M9 catalog, reached through `ContentDependencies`): the provider, the reuse cache and the
 * cost limits (ADR-013). No database — nothing about a generation is persisted — so, unlike the
 * other `*-dependencies.ts` files, this one is unit-tested rather than excluded from coverage.
 */
export interface AudioDependencies {
  provider: AudioGenerationService;
  cache: AudioCache;
  options: GenerateAudioOptions;
}

/** Distinct provider calls this process runs at once — each holds a request open for seconds. */
const MAX_CONCURRENT_GENERATIONS = 4;

/** ~100 short clips (a word at 24 kHz/16-bit mono is ~50 KB) within a 32 MB ceiling. */
const CACHE_MAX_ENTRIES = 200;
const CACHE_MAX_BYTES = 32 * 1024 * 1024;

/**
 * Selects the provider from `env.AUDIO_GENERATION_PROVIDER`: `"fake"` (the default — a committed
 * adapter that never calls Gemini) everywhere except a deliberately configured `"gemini"` run,
 * which `loadEnv` refuses under NODE_ENV=test and without GEMINI_API_KEY. The model name is read
 * here and nowhere else.
 */
export function selectAudioGenerationProvider(
  env: Pick<AppEnv, "AUDIO_GENERATION_PROVIDER" | "GEMINI_API_KEY" | "GEMINI_TTS_MODEL">,
): AudioGenerationService {
  if (env.AUDIO_GENERATION_PROVIDER === "gemini") {
    return new GeminiAudioProvider({
      apiKey: env.GEMINI_API_KEY ?? "",
      model: env.GEMINI_TTS_MODEL,
    });
  }
  return new FakeAudioGenerationService();
}

export function createAudioDependencies(env: AppEnv): AudioDependencies {
  return {
    provider: selectAudioGenerationProvider(env),
    cache: new InMemoryAudioCache({ maxEntries: CACHE_MAX_ENTRIES, maxBytes: CACHE_MAX_BYTES }),
    options: {
      maxTextLength: env.AUDIO_GENERATION_MAX_TEXT_LENGTH,
      maxConcurrent: MAX_CONCURRENT_GENERATIONS,
    },
  };
}
