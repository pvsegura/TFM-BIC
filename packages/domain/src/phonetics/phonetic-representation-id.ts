import type { Brand } from "@tfm-bic/shared";

import { isValidContentId } from "../content/content-id.js";
import type { LanguageId } from "../language/language-id.js";
import { InvalidPhoneticRepresentationIdError } from "./errors/invalid-phonetic-representation-id.error.js";

/**
 * A stable, human-readable identifier for one phonetic representation (one sound, transcription
 * or pronunciation note), for example `pl-ipa-ts`. It is identity, not description: the IPA
 * symbol, the description and the position may all change and the id never does, so a student's
 * progress keeps pointing at the same representation. It follows the content-id rules on
 * purpose — the same strict pattern and length, language-prefixed — so an id is safe in a URL, a
 * file name and a database column, and can never carry path separators, markup or SQL.
 */
export type PhoneticRepresentationId = Brand<string, "PhoneticRepresentationId">;

export function isValidPhoneticRepresentationId(value: string): boolean {
  return isValidContentId(value);
}

export function createPhoneticRepresentationId(value: string): PhoneticRepresentationId {
  if (!isValidPhoneticRepresentationId(value)) {
    throw new InvalidPhoneticRepresentationIdError(value);
  }
  return value as PhoneticRepresentationId;
}

export function phoneticRepresentationIdBelongsToLanguage(
  id: PhoneticRepresentationId,
  languageId: LanguageId,
): boolean {
  return id.startsWith(`${languageId}-`);
}
