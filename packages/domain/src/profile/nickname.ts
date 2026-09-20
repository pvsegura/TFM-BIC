import { InvalidNicknameError } from "./errors/invalid-nickname.error.js";

export const MIN_NICKNAME_LENGTH = 2;
export const MAX_NICKNAME_LENGTH = 30;

const CONTROL_CHARACTER = /\p{Cc}/u;

/** Trim surrounding whitespace only — see `normalizeProfileName`. */
export function normalizeNickname(value: string): string {
  return value.trim();
}

/**
 * Validates an already-normalized nickname: 2–30 characters, no control
 * characters, no alphabet restriction (multilingual). A nickname is optional
 * on the profile, but one that *is* provided must meet these rules — an
 * empty/whitespace-only nickname is rejected, not silently treated as unset.
 */
export function isValidNickname(value: string): boolean {
  return (
    value.length >= MIN_NICKNAME_LENGTH &&
    value.length <= MAX_NICKNAME_LENGTH &&
    !CONTROL_CHARACTER.test(value)
  );
}

export function createNickname(value: string): string {
  const normalized = normalizeNickname(value);
  if (!isValidNickname(normalized)) {
    throw new InvalidNicknameError();
  }
  return normalized;
}
