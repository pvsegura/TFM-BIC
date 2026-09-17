/**
 * Deliberately generic — thrown for both "no such user" and "wrong
 * password" so the API boundary cannot distinguish them (account-enumeration
 * resistance, see docs/security/security-baseline.md).
 */
export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}
