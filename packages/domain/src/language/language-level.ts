import type { LanguageId } from "./language-id.js";
import type { LevelId } from "./level-id.js";

/**
 * `available`: the level has published content and can be chosen as a learning
 * option. `planned`: the language intends to offer it (shown as "coming soon")
 * but has no content yet — it must never be selectable. A combination a
 * language does not list at all is simply not offered.
 */
export const LEVEL_STATUSES = ["available", "planned"] as const;
export type LevelStatus = (typeof LEVEL_STATUSES)[number];

export function isValidLevelStatus(value: string): value is LevelStatus {
  return LEVEL_STATUSES.some((status) => status === value);
}

/** One language's declared availability of one CEFR level. */
export interface LanguageLevel {
  languageId: LanguageId;
  levelId: LevelId;
  status: LevelStatus;
}

export function isLevelSelectable(languageLevel: LanguageLevel): boolean {
  return languageLevel.status === "available";
}
