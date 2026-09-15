import type { Brand } from "@tfm-bic/shared";

import { InvalidLanguageIdError } from "./invalid-language-id.error.js";

/**
 * A validated language identifier (ISO 639-1/639-2 style, e.g. "pl", "en").
 *
 * Content and application code parameterize by `languageId` instead of
 * branching on language identity (see docs/architecture/content-architecture.md)
 * — this value object is the single place that validates the shape of that
 * identifier, so callers cannot pass an arbitrary unvalidated string.
 */
export type LanguageId = Brand<string, "LanguageId">;

const LANGUAGE_ID_PATTERN = /^[a-z]{2,3}$/;

export function isValidLanguageId(value: string): boolean {
  return LANGUAGE_ID_PATTERN.test(value);
}

export function createLanguageId(value: string): LanguageId {
  if (!isValidLanguageId(value)) {
    throw new InvalidLanguageIdError(value);
  }
  return value as LanguageId;
}
