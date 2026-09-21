import type { Brand } from "@tfm-bic/shared";

import { isValidContentId } from "../content/content-id.js";
import { InvalidAchievementError } from "./errors/invalid-achievement.error.js";

/**
 * The stable, language-neutral identity of one achievement, for example `first-exercise`.
 * It is what is stored, sent over the API and used to look up a rule; the title and
 * description a student reads are a separate, localisable concern, so no key ever
 * depends on (or changes with) a language. Same strict slug pattern as every other id.
 */
export type AchievementKey = Brand<string, "AchievementKey">;

export function isValidAchievementKey(value: string): boolean {
  return isValidContentId(value);
}

export function createAchievementKey(value: string): AchievementKey {
  if (!isValidAchievementKey(value)) {
    throw new InvalidAchievementError(`"${value}" is not a valid achievement key.`);
  }
  return value as AchievementKey;
}
