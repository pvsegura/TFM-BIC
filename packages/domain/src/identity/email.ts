import { InvalidEmailError } from "./errors/invalid-email.error.js";

/**
 * Email normalization strategy (documented per M3 brief — "email normalization
 * must be defined and tested"): trim surrounding whitespace, then lowercase
 * the whole address (local part included). This project does NOT apply any
 * provider-specific alias folding (e.g. Gmail's `+tag`/dot-insensitivity) —
 * RFC 5321 technically allows a case-sensitive local part, but virtually no
 * real mail provider relies on that, and folding by provider would require
 * guessing provider-specific rules the brief explicitly forbids. The
 * normalized form is the single source of truth for uniqueness/lookup.
 */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

const MAX_EMAIL_LENGTH = 254; // RFC 5321 §4.5.3.1.3 total-address limit.
// Pragmatic (not full RFC 5322) validation: one "@", non-empty local/domain
// parts with no embedded whitespace, at least one "." in the domain part.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  if (value.length === 0 || value.length > MAX_EMAIL_LENGTH) {
    return false;
  }
  // Explicit guard against header-injection payloads (embedded CR/LF), on
  // top of the pattern above already excluding whitespace from each part.
  if (/[\r\n]/.test(value)) {
    return false;
  }
  return EMAIL_PATTERN.test(value);
}

/**
 * Validates and normalizes an email address in one step — the only
 * constructor for the canonical/lookup representation of an email used
 * throughout the Identity & Authentication context.
 */
export function createEmail(value: string): string {
  const normalized = normalizeEmail(value);
  if (!isValidEmail(normalized)) {
    throw new InvalidEmailError();
  }
  return normalized;
}
