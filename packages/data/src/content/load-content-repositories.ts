import type { ContentRepository, ExerciseRepository } from "@tfm-bic/application";

import { CatalogContentRepository } from "./catalog-content-repository.js";
import { CatalogExerciseRepository } from "./catalog-exercise-repository.js";
import { ContentValidationError } from "./content-validation.error.js";
import { DEFAULT_CONTENT_ROOT } from "./content-root.js";
import { loadContentCatalog } from "./load-content-catalog.js";

export interface ContentRepositories {
  contentRepository: ContentRepository;
  exerciseRepository: ExerciseRepository;
}

/**
 * Reads and validates the whole `content/` tree once and serves every kind of
 * content from that one catalog: lessons and explanations through the content
 * repository, exercises through the exercise repository. Because they share the
 * catalog they can never disagree about which version of the content is live. A
 * malformed file — content or exercise — rejects with a `ContentValidationError`
 * listing every problem, so the server refuses to start instead of failing on a
 * student's request.
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
  };
}
