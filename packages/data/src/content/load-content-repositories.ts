import type {
  ContentRepository,
  ExerciseRepository,
  PhoneticContentRepository,
  VideoDefinitionRepository,
  VocabularyRepository,
} from "@tfm-bic/application";

import { CatalogContentRepository } from "./catalog-content-repository.js";
import { CatalogExerciseRepository } from "./catalog-exercise-repository.js";
import { CatalogPhoneticRepository } from "./catalog-phonetic-repository.js";
import { CatalogVideoDefinitionRepository } from "./catalog-video-definition-repository.js";
import { CatalogVocabularyRepository } from "./catalog-vocabulary-repository.js";
import { ContentValidationError } from "./content-validation.error.js";
import { DEFAULT_CONTENT_ROOT } from "./content-root.js";
import { loadContentCatalog } from "./load-content-catalog.js";

export interface ContentRepositories {
  contentRepository: ContentRepository;
  exerciseRepository: ExerciseRepository;
  vocabularyRepository: VocabularyRepository;
  phoneticRepository: PhoneticContentRepository;
  videoDefinitionRepository: VideoDefinitionRepository;
}

/**
 * Reads and validates the whole `content/` tree once and serves every kind of
 * content from that one catalog: lessons and explanations through the content
 * repository, exercises through the exercise repository, vocabulary through the
 * vocabulary repository, phonetics through the phonetic repository. Because they
 * share the catalog they can never disagree about which version of the content
 * is live. A malformed file — content, exercise, vocabulary or phonetics —
 * rejects with a `ContentValidationError` listing every problem, so the server
 * refuses to start instead of failing on a student's request.
 */
export async function loadContentRepositories(
  contentRoot: string = DEFAULT_CONTENT_ROOT,
): Promise<ContentRepositories> {
  const result = await loadContentCatalog(contentRoot);
  if (!result.ok) {
    throw new ContentValidationError(result.issues);
  }
  return {
    contentRepository: new CatalogContentRepository(result.catalog),
    exerciseRepository: new CatalogExerciseRepository(result.catalog),
    vocabularyRepository: new CatalogVocabularyRepository(result.catalog),
    phoneticRepository: new CatalogPhoneticRepository(result.catalog),
    videoDefinitionRepository: new CatalogVideoDefinitionRepository(result.catalog),
  };
}
