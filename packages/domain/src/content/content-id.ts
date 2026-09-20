import type { Brand } from "@tfm-bic/shared";

import type { LanguageId } from "../language/language-id.js";
import { InvalidContentIdError } from "./errors/invalid-content-id.error.js";

/**
 * A stable, human-readable identifier for one content item, for example
 * `pl-greetings`. It never changes when the title, translation, description or
 * order changes — those are editable fields, this is identity. Ids are
 * globally unique and namespaced by language (`<languageId>-...`), which keeps
 * two languages from ever colliding and lets a misfiled item be detected.
 *
 * The strict pattern also means an id is safe to put in a URL and can never
 * contain path separators or markup.
 */
export type ContentId = Brand<string, "ContentId">;

const MAX_CONTENT_ID_LENGTH = 64;
const CONTENT_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function isValidContentId(value: string): boolean {
  return value.length <= MAX_CONTENT_ID_LENGTH && CONTENT_ID_PATTERN.test(value);
}

export function createContentId(value: string): ContentId {
  if (!isValidContentId(value)) {
    throw new InvalidContentIdError(value);
  }
  return value as ContentId;
}

export function contentIdBelongsToLanguage(id: ContentId, languageId: LanguageId): boolean {
  return id.startsWith(`${languageId}-`);
}
