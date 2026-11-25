import type {
  BookIndexRepository,
  ContentRepository,
  ExerciseRepository,
  GrammarReferenceRepository,
  PhoneticContentRepository,
  VocabularyRepository,
} from "@verbysia/application";
import path from "node:path";

import {
  DEFAULT_CONTENT_ROOT,
  FileBookIndexRepository,
  FileContentMediaCatalog,
  loadContentRepositories,
} from "@verbysia/data";

/**
 * Everything the language/content/exercise-content/vocabulary-content/phonetics-content/media
 * routes need. Unlike auth and profile there is no connection to close: the validated content —
 * lessons, explanations, exercises, vocabulary and phonetics alike — is held in memory.
 */
export interface ContentDependencies {
  contentRepository: ContentRepository;
  /** Exercises are content too (ADR-020): read-only, from the same validated catalog. */
  exerciseRepository: ExerciseRepository;
  /** Vocabulary is content too (ADR-022): read-only, from the same validated catalog. */
  vocabularyRepository: VocabularyRepository;
  /** Phonetics is content too (M10): read-only, from the same validated catalog. */
  phoneticRepository: PhoneticContentRepository;
  /**
   * Published educational media (M21, ADR-031): read once from <content>/media/manifest.json.
   * Optional so hand-built test fixtures need not provide it; absent means "no media yet".
   */
  mediaCatalog?: FileContentMediaCatalog;
  /** The grammar reference (M23). Optional for hand-built fixtures; absent means "no topics". */
  grammarRepository?: GrammarReferenceRepository;
  /** Page numbers of the printed books (content/books). Optional for hand-built fixtures. */
  bookIndexRepository?: BookIndexRepository;
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
  const bookIndexRepository = new FileBookIndexRepository(
    path.join(contentDir ?? DEFAULT_CONTENT_ROOT, "books"),
  );
  return { ...repositories, mediaCatalog, bookIndexRepository };
}
