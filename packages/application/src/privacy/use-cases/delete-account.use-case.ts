import { AccountDeletionRefusedError } from "@tfm-bic/domain";

import type { PasswordHasher } from "../../identity/ports/password-hasher.js";
import type { UserRepository } from "../../identity/ports/user-repository.js";
import type { AccountErasureStore } from "../ports/account-erasure-store.js";

export interface DeleteAccountInput {
  /** Always the session's user — never a value taken from the request. */
  userId: string;
  /** The current password, re-entered: a valid session alone cannot delete an account. */
  password: string;
}

export interface DeleteAccountResult {
  /** `false` when the account was already gone — a repeated request changes nothing. */
  deleted: boolean;
}

/**
 * Self-service account deletion (M15, ADR-026): an immediate, irreversible erasure of the
 * account and every row the user-data register lists for it, in one transaction. Re-entering the
 * password is required. Withdrawing newsletter consent is a separate, lighter action (M14) — this
 * use case is never used for it, and it is not used to "unsubscribe".
 */
export class DeleteAccountUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly erasureStore: AccountErasureStore,
  ) {}

  async execute(input: DeleteAccountInput): Promise<DeleteAccountResult> {
    const user = await this.userRepository.findById(input.userId);
    if (user === null) {
      return { deleted: false };
    }
    const passwordMatches = await this.passwordHasher.verify(user.passwordHash, input.password);
    if (!passwordMatches) {
      throw new AccountDeletionRefusedError();
    }
    return { deleted: await this.erasureStore.eraseAccount(user.id) };
  }
}
