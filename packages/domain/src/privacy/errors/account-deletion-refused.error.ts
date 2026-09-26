/**
 * Account deletion was refused because the re-entered password did not match (M15). Deleting an
 * account is irreversible, so a valid session alone is not enough — see ADR-026.
 */
export class AccountDeletionRefusedError extends Error {
  constructor() {
    super("The password is incorrect.");
    this.name = "AccountDeletionRefusedError";
  }
}
