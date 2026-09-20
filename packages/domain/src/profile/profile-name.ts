import { InvalidProfileNameError } from "./errors/invalid-profile-name.error.js";

/** Generous on purpose: long compound and multi-part names are legitimate. */
export const MAX_PROFILE_NAME_LENGTH = 100;

const CONTROL_CHARACTER = /\p{Cc}/u;

/**
 * Profile name (first/last) normalization — trim surrounding whitespace and
 * nothing else. No case folding, no diacritic stripping, no collapsing of
 * internal spacing: names are user-entered identity, not identifiers, and the
 * application is multilingual ("Łukasz" must stay "Łukasz").
 */
export function normalizeProfileName(value: string): string {
  return value.trim();
}

/**
 * Validates an already-normalized name. Only length and control characters
 * (which include CR/LF/TAB/NUL) are rejected — no script/alphabet allow-list,
 * so any language's letters pass. HTML- or SQL-looking text is deliberately
 * accepted as inert text: it is never interpreted (React escapes on render,
 * queries are parameterized), and rejecting punctuation would wrongly reject
 * real names.
 */
export function isValidProfileName(value: string): boolean {
  return (
    value.length >= 1 && value.length <= MAX_PROFILE_NAME_LENGTH && !CONTROL_CHARACTER.test(value)
  );
}

/**
 * Validates and normalizes a name in one step. Whitespace-only input
 * normalizes to "" and is rejected — it is never stored as a blank name.
 */
export function createProfileName(value: string): string {
  const normalized = normalizeProfileName(value);
  if (!isValidProfileName(normalized)) {
    throw new InvalidProfileNameError();
  }
  return normalized;
}
