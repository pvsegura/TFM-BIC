import type { AudioFormat, LanguageId, VoiceProfile } from "@tfm-bic/domain";

/**
 * What a use case asks an audio provider for — in the platform's terms, never a provider SDK
 * type. `locale` is the language's BCP 47 tag from the content catalog (e.g. `pl-PL`): a
 * provider-neutral hint an adapter may translate into whatever its provider understands.
 * Nothing about the student is ever part of this request.
 */
export interface AudioGenerationRequest {
  text: string;
  languageId: LanguageId;
  locale: string;
  voice: VoiceProfile;
}

/**
 * A generated clip, normalised by the adapter: the encoded bytes and their format. `provider` and
 * `model` are opaque labels for logs only (e.g. `"gemini"` / the configured model name) — nothing
 * branches on them.
 */
export interface GeneratedAudio {
  data: Uint8Array;
  format: AudioFormat;
  provider: string;
  model: string | null;
}

/**
 * The provider boundary (ADR-011/013): the only thing between a use case and a text-to-speech
 * provider. Implemented in `packages/data` by `FakeAudioGenerationService` (the default in
 * development, tests and CI) and `GeminiAudioProvider` (selected only via
 * `AUDIO_GENERATION_PROVIDER=gemini`). A new provider is a new adapter behind this interface.
 *
 * One synchronous request/result call: the verified Gemini TTS API returns the whole clip inline in
 * its response, so there is no provider job to poll or cancel.
 *
 * Rejects only with the provider errors in `audio-generation-errors.ts` — never a raw provider
 * error — so no caller needs to know which provider is behind it.
 */
export interface AudioGenerationService {
  generate(request: AudioGenerationRequest): Promise<GeneratedAudio>;
}
