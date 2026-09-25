import {
  isLevelSelectable,
  isPublished,
  VideoDefinitionNotFoundError,
  type VideoDefinition,
  type VideoDefinitionId,
} from "@tfm-bic/domain";

import type { ContentRepository } from "../content/ports/content-repository.js";
import type { VideoDefinitionRepository } from "./ports/video-definition-repository.js";

/**
 * The one place that decides whether a student may request a video's generation. Reuses the M5
 * language/level visibility rule (active language; a level that is `available`) and adds video's
 * own: the definition must be `published`. Unlike phonetics, `levelId` is mandatory on a video
 * definition, so the level check always applies. Every reason it is not visible is the same
 * `VideoDefinitionNotFoundError`, so a caller cannot tell a draft from a typo.
 */
export async function findVisibleVideoDefinition(
  contentRepository: ContentRepository,
  videoDefinitions: VideoDefinitionRepository,
  videoDefinitionId: VideoDefinitionId,
): Promise<VideoDefinition> {
  const definition = await videoDefinitions.findById(videoDefinitionId);
  if (!definition || !isPublished(definition)) {
    throw new VideoDefinitionNotFoundError(videoDefinitionId);
  }

  const language = await contentRepository.findLanguage(definition.languageId);
  if (!language?.isActive) {
    throw new VideoDefinitionNotFoundError(videoDefinitionId);
  }

  const declared = await contentRepository.listLanguageLevels(definition.languageId);
  const entry = declared.find((candidate) => candidate.levelId === definition.levelId);
  if (!entry || !isLevelSelectable(entry)) {
    throw new VideoDefinitionNotFoundError(videoDefinitionId);
  }

  return definition;
}
