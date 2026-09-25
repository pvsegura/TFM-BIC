import type { VocabularyItemId, VoiceProfile } from "@tfm-bic/domain";

import type { ContentRepository } from "../../content/ports/content-repository.js";
import { findVisibleVocabularyItem } from "../../vocabulary/find-visible-vocabulary-item.js";
import type { VocabularyRepository } from "../../vocabulary/ports/vocabulary-repository.js";
import { AudioSourceTextMissingError } from "../errors/audio-generation-errors.js";
import type { GenerateAudioResult, GenerateAudioUseCase } from "./generate-audio.use-case.js";

/** Which of a vocabulary entry's texts to speak. */
export const VOCABULARY_AUDIO_PARTS = ["lemma", "example"] as const;
export type VocabularyAudioPart = (typeof VOCABULARY_AUDIO_PARTS)[number];

export interface GenerateVocabularyAudioInput {
  vocabularyItemId: VocabularyItemId;
  part: VocabularyAudioPart;
  voice: VoiceProfile;
}

/**
 * The first consumer of the audio capability (M12): "listen" to a vocabulary entry (M9). The
 * client only names the entry and which of its texts to hear; the text itself and its language
 * always come from the content catalog, so no client-written text ever reaches the provider.
 * Visibility is vocabulary's own rule (`findVisibleVocabularyItem`): an entry a student cannot see
 * is the same not-found, and nothing is generated for it.
 */
export class GenerateVocabularyAudioUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly vocabulary: VocabularyRepository,
    private readonly generateAudio: GenerateAudioUseCase,
  ) {}

  async execute(input: GenerateVocabularyAudioInput): Promise<GenerateAudioResult> {
    const item = await findVisibleVocabularyItem(
      this.contentRepository,
      this.vocabulary,
      input.vocabularyItemId,
    );

    const text = input.part === "lemma" ? item.lemma : item.example?.text;
    if (text === undefined) {
      throw new AudioSourceTextMissingError(input.part);
    }

    return this.generateAudio.execute({ text, languageId: item.languageId, voice: input.voice });
  }
}
