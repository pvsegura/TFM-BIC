import type { VideoDefinitionRepository } from "@tfm-bic/application";
import type { ContentCatalog, VideoDefinition, VideoDefinitionId } from "@tfm-bic/domain";

/**
 * A `VideoDefinitionRepository` over an already-validated catalog held in memory — the same
 * catalog the content, exercise, vocabulary and phonetic repositories serve, so they can never
 * disagree about which version of the content is live. Storage only, read-only by construction: a
 * database- or CMS-backed adapter would replace this class and nothing above the port would
 * change.
 */
export class CatalogVideoDefinitionRepository implements VideoDefinitionRepository {
  private readonly byId: ReadonlyMap<VideoDefinitionId, VideoDefinition>;

  constructor(catalog: ContentCatalog) {
    this.byId = new Map(catalog.videoDefinitions.map((item) => [item.id, item]));
  }

  findById(videoDefinitionId: VideoDefinitionId): Promise<VideoDefinition | null> {
    return Promise.resolve(this.byId.get(videoDefinitionId) ?? null);
  }
}
