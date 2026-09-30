import type {
  ContentRepository,
  ExerciseRepository,
  PhoneticContentRepository,
  VideoDefinitionRepository,
  VocabularyRepository,
} from "@tfm-bic/application";
import path from "node:path";

import {
  DEFAULT_CONTENT_ROOT,
  FileContentMediaCatalog,
  loadContentRepositories,
} from "@tfm-bic/data";

/**
 * Everything the language/content/exercise-content/vocabulary-content/phonetics-content/
 * video-content routes need. Unlike auth and profile there is no connection to close: the
 * validated content — lessons, explanations, exercises, vocabulary, phonetics and video
 * definitions alike — is held in memory.
 */
export interface ContentDependencies {
  contentRepository: ContentRepository;
  /** Exercises are content too (ADR-020): read-only, from the same validated catalog. */
  exerciseRepository: ExerciseRepository;
  /** Vocabulary is content too (ADR-022): read-only, from the same validated catalog. */
  vocabularyRepository: VocabularyRepository;
  /** Phonetics is content too (M10): read-only, from the same validated catalog. */
  phoneticRepository: PhoneticContentRepository;
  /** Video definitions are content too (M11): read-only, from the same validated catalog. */
  videoDefinitionRepository: VideoDefinitionRepository;
  /**
   * Published educational media (M21, ADR-031): read once from <content>/media/manifest.json.
   * Optional so hand-built test fixtures need not provide it; absent means "no media yet".
   */
  mediaCatalog?: FileContentMediaCatalog;
}

/**
 * Reads and validates the whole content tree (ADR-018) — `contentDir`, or the
 * repository's own `content/` folder when omitted. Rejects with a
 * `ContentValidationError` listing every problem, so the server refuses to
 * start on malformed content or an invalid exercise instead of failing on a
 * student's request.
 */
export async function createContentDependencies(contentDir?: string): Promise<ContentDependencies> {
  const repositories = await loadContentRepositories(contentDir);
  const mediaCatalog = new FileContentMediaCatalog(
    path.join(contentDir ?? DEFAULT_CONTENT_ROOT, "media"),
  );
  return { ...repositories, mediaCatalog };
}
