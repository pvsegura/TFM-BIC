import type { ContentRepository, ExerciseRepository } from "@tfm-bic/application";
import { loadContentRepositories } from "@tfm-bic/data";

/**
 * Everything the language/content/exercise-content routes need. Unlike auth and
 * profile there is no connection to close: the validated content — lessons,
 * explanations and exercises alike — is held in memory.
 */
export interface ContentDependencies {
  contentRepository: ContentRepository;
  /** Exercises are content too (ADR-020): read-only, from the same validated catalog. */
  exerciseRepository: ExerciseRepository;
}

/**
 * Reads and validates the whole content tree (ADR-018) — `contentDir`, or the
 * repository's own `content/` folder when omitted. Rejects with a
 * `ContentValidationError` listing every problem, so the server refuses to
 * start on malformed content or an invalid exercise instead of failing on a
 * student's request.
 */
export async function createContentDependencies(contentDir?: string): Promise<ContentDependencies> {
  return loadContentRepositories(contentDir);
}
