import type { Brand } from "@tfm-bic/shared";

import type { LanguageId } from "../language/language-id.js";
import { InvalidSpeechTextError } from "./errors/invalid-speech-text.error.js";
import type { VoiceProfile } from "./voice-profile.js";

/**
 * The hard ceiling for one clip, in characters. Deployments may configure a lower limit
 * (`AUDIO_GENERATION_MAX_TEXT_LENGTH`), never a higher one: generation costs money per request,
 * and educational clips (a word, an example sentence) are short.
 */
export const SPEECH_TEXT_MAX_LENGTH = 500;

/** Text that is safe to hand to a speech provider: trimmed, whitespace-collapsed, non-empty, within the limit. */
export type SpeechText = Brand<string, "SpeechText">;

// C0 controls and DEL. Whitespace controls (tab, newline, ...) are collapsed before this runs.
// eslint-disable-next-line no-control-regex -- matching control characters is the point.
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function createSpeechText(raw: string, maxLength = SPEECH_TEXT_MAX_LENGTH): SpeechText {
  const text = raw.replace(/\s+/g, " ").trim();
  if (text.length === 0) {
    throw new InvalidSpeechTextError("empty");
  }
  if (CONTROL_CHARACTERS.test(text)) {
    throw new InvalidSpeechTextError("control_characters");
  }
  // Characters (code points), not UTF-16 units — "😀" is one character to a learner.
  const limit = Math.min(maxLength, SPEECH_TEXT_MAX_LENGTH);
  if ([...text].length > limit) {
    throw new InvalidSpeechTextError("too_long");
  }
  return text as SpeechText;
}

/**
 * One request for speech, provider-independent: what to say, in which of the platform's
 * languages, and how it should sound. No user, no provider, no model — none of those change what
 * the learner hears.
 */
export interface SpeechRequest {
  text: SpeechText;
  languageId: LanguageId;
  voice: VoiceProfile;
}

export function createSpeechRequest(
  input: { text: string; languageId: LanguageId; voice: VoiceProfile },
  maxLength = SPEECH_TEXT_MAX_LENGTH,
): SpeechRequest {
  return {
    text: createSpeechText(input.text, maxLength),
    languageId: input.languageId,
    voice: input.voice,
  };
}

/**
 * Two requests with the same key produce the same audio, so a caller may reuse one's result for
 * the other (see `GenerateAudioUseCase`). JSON-encoded so no text can forge another request's key.
 */
export function speechRequestKey(request: SpeechRequest): string {
  return JSON.stringify([request.languageId, request.voice, request.text]);
}
