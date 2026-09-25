import { GenerateAudioUseCase, GenerateVocabularyAudioUseCase } from "@tfm-bic/application";

import type { AudioDependencies } from "./audio-dependencies.js";
import type { ContentDependencies } from "./content-dependencies.js";

export interface AudioUseCases {
  generateAudio: GenerateAudioUseCase;
  generateVocabularyAudio: GenerateVocabularyAudioUseCase;
}

/**
 * Composition-root wiring only. One `GenerateAudioUseCase` per server, so its in-flight
 * de-duplication and concurrency limit cover every consumer; `GenerateVocabularyAudioUseCase`
 * builds on it and on the content dependencies' vocabulary visibility rule.
 */
export function createAudioUseCases(
  content: ContentDependencies,
  deps: AudioDependencies,
): AudioUseCases {
  const generateAudio = new GenerateAudioUseCase(
    content.contentRepository,
    deps.provider,
    deps.cache,
    deps.options,
  );
  return {
    generateAudio,
    generateVocabularyAudio: new GenerateVocabularyAudioUseCase(
      content.contentRepository,
      content.vocabularyRepository,
      generateAudio,
    ),
  };
}
