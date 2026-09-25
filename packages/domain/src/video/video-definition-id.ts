import type { Brand } from "@tfm-bic/shared";

import { isValidContentId } from "../content/content-id.js";
import type { LanguageId } from "../language/language-id.js";
import { InvalidVideoDefinitionIdError } from "./errors/invalid-video-definition-id.error.js";

/**
 * A stable, human-readable identifier for one video definition (what should be generated), for
 * example `pl-a1-nasal-vowels-demo`. It is identity, not description: the title, description and
 * script may all change and the id never does, so a generation job keeps pointing at the same
 * definition. It follows the content-id rules on purpose — the same strict pattern and length,
 * language-prefixed — so an id is safe in a URL, a file name and a database column.
 */
export type VideoDefinitionId = Brand<string, "VideoDefinitionId">;

export function isValidVideoDefinitionId(value: string): boolean {
  return isValidContentId(value);
}

export function createVideoDefinitionId(value: string): VideoDefinitionId {
  if (!isValidVideoDefinitionId(value)) {
    throw new InvalidVideoDefinitionIdError(value);
  }
  return value as VideoDefinitionId;
}

export function videoDefinitionIdBelongsToLanguage(
  id: VideoDefinitionId,
  languageId: LanguageId,
): boolean {
  return id.startsWith(`${languageId}-`);
}
