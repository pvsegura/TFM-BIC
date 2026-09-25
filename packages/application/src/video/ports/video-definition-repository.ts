import type { VideoDefinition, VideoDefinitionId } from "@tfm-bic/domain";

/**
 * Where video definitions come from. Owned by this layer, implemented in `packages/data` (today:
 * validated JSON files under `content/languages/<id>/videos/`, the same content architecture
 * lessons, exercises, vocabulary and phonetics use).
 *
 * Storage only: it returns a definition of any status. Which one a student may request is a
 * business rule of `findVisibleVideoDefinition`, so a new adapter cannot accidentally widen
 * visibility.
 */
export interface VideoDefinitionRepository {
  findById(videoDefinitionId: VideoDefinitionId): Promise<VideoDefinition | null>;
}
