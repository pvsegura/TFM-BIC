import { isLevelSelectable, type LanguageId, type LevelId } from "@verbysia/domain";

import type { ContentRepository } from "./ports/content-repository.js";

/**
 * M5's language/level visibility rule, in one place: the language is active and — when the item
 * declares a level — that level is selectable. Each `findVisible*` adds its own conditions
 * (published, a published category or topic…) and throws its own not-found error, so a caller
 * still cannot tell a draft from a typo.
 */
export async function isVisibleInCatalog(
  contentRepository: ContentRepository,
  placement: { languageId: LanguageId; levelId?: LevelId | undefined },
): Promise<boolean> {
  const language = await contentRepository.findLanguage(placement.languageId);
  if (!language?.isActive) return false;

  if (placement.levelId === undefined) return true;
  const declared = await contentRepository.listLanguageLevels(placement.languageId);
  const entry = declared.find((candidate) => candidate.levelId === placement.levelId);
  return entry !== undefined && isLevelSelectable(entry);
}
