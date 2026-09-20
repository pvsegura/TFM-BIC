import { CatalogContentRepository } from "./catalog-content-repository.js";
import { ContentValidationError } from "./content-validation.error.js";
import { DEFAULT_CONTENT_ROOT } from "./content-root.js";
import { loadContentCatalog } from "./load-content-catalog.js";

/**
 * The content repository for the version-controlled `content/` tree. It reads
 * and validates everything once, at startup, and then serves from memory: the
 * content only changes with a new release, and a malformed file stops the
 * server from starting instead of failing on a student's request.
 */
export class FileSystemContentRepository extends CatalogContentRepository {
  static async load(
    contentRoot: string = DEFAULT_CONTENT_ROOT,
  ): Promise<FileSystemContentRepository> {
    const result = await loadContentCatalog(contentRoot);
    if (!result.ok) {
      throw new ContentValidationError(result.issues);
    }
    return new FileSystemContentRepository(result.catalog);
  }
}
