/**
 * Erases an account (M15, ADR-026): every row the user-data register lists for the user —
 * sessions, security tokens, profile, learning records, points, consent records, teacher links,
 * media jobs — and the account itself, in **one transaction**. Either all of it is gone or none
 * of it is. Resolves `true` when the account existed and was erased, `false` when it was already
 * gone (so a repeated request is a harmless no-op).
 */
export interface AccountErasureStore {
  eraseAccount(userId: string): Promise<boolean>;
}
