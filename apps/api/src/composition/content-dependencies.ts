import type { ContentRepository } from "@tfm-bic/application";
import { FileSystemContentRepository } from "@tfm-bic/data";

/**
 * Everything the language/content routes need. Unlike auth and profile there
 * is no connection to close: the validated content is held in memory.
 */
export interface ContentDependencies {
  contentRepository: ContentRepository;
}

/**
 * Reads and validates the whole content tree (ADR-018) — `contentDir`, or the
 * repository's own `content/` folder when omitted. Rejects with a
 * `ContentValidationError` listing every problem, so the server refuses to
 * start on malformed content instead of failing on a student's request.
 */
export async function createContentDependencies(contentDir?: string): Promise<ContentDependencies> {
  return { contentRepository: await FileSystemContentRepository.load(contentDir) };
}
