/**
 * Thrown by `UserRepository.create` when the normalized-email uniqueness
 * constraint is violated (enforced at the database level, see
 * docs/adr/adr-005-database.md). `RegisterUserUseCase` catches this and
 * still returns its generic success response — see ADR-006's
 * account-enumeration-resistance rationale — so this error is not expected
 * to reach the API boundary in the register flow; it is a distinct type so
 * callers that legitimately need to react to it (this one included) don't
 * have to pattern-match a generic Error.
 */
export class DuplicateEmailError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "DuplicateEmailError";
  }
}
