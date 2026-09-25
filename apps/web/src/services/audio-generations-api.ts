import { AUDIO_RESPONSE_CONTENT_TYPES, type AudioGenerationRequestBody } from "@tfm-bic/contracts";

import { ApiError } from "./api-error.js";
import { toApiError } from "./api-request.js";

export interface VocabularyAudioRequest {
  vocabularyItemId: string;
  part: "lemma" | "example";
  voice: AudioGenerationRequestBody["voice"];
}

/**
 * Asks the API for a clip of a vocabulary entry (M12). Only which entry, which of its texts and
 * which voice profile are sent — never the text itself, never a user id; the session cookie
 * identifies the student. The answer is the audio itself, returned as a `Blob` for an `<audio>`
 * element. No provider (Gemini or otherwise) is known here.
 */
export async function requestVocabularyAudio(request: VocabularyAudioRequest): Promise<Blob> {
  const body = {
    source: {
      type: "vocabulary-item",
      vocabularyItemId: request.vocabularyItemId,
      part: request.part,
    },
    voice: request.voice,
  };
  const response = await fetch("/audio-generations", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: AUDIO_RESPONSE_CONTENT_TYPES.join(", "),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  const contentType = response.headers.get("Content-Type") ?? "";
  if (!(AUDIO_RESPONSE_CONTENT_TYPES as readonly string[]).includes(contentType)) {
    throw new ApiError("Something went wrong. Please try again.", response.status);
  }
  return response.blob();
}
