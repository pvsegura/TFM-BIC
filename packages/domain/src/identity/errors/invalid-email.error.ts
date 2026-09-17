/**
 * Deliberately does not include the raw input in the message (unlike
 * InvalidLanguageIdError) — email addresses are personal data, and this
 * error can end up in logs; see docs/security/security-baseline.md
 * ("do not over-log personal data").
 */
export class InvalidEmailError extends Error {
  constructor() {
    super("Not a valid email address.");
    this.name = "InvalidEmailError";
  }
}
