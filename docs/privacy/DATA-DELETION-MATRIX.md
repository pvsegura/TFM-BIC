# Data deletion matrix

Status: ACCEPTED (M15, [ADR-026](../adr/adr-026-privacy-data-management.md)). Not legal advice — see the
[disclaimer](README.md).

**Decision (product owner, 2026-09-26): immediate hard delete.** Self-service deletion
(`POST /data-management/account-deletion`, password + explicit confirmation) erases the account at once. No table
currently has a documented retention requirement — there is no billing or financial data — so nothing is retained
or anonymised. If legal review identifies a retention requirement for any category, it is recorded here and in
`USER_DATA_REGISTER` with its reason (the domain refuses `retain`/`anonymise` without one), and the erasure store
must implement it; until then the store refuses any non-`delete` disposition.

## How it runs

`DrizzleAccountErasureStore.eraseAccount` — **one transaction**:

1. `SELECT … FROM users WHERE id = $1 FOR UPDATE` — locks the account so no concurrent request can insert a row that
   references it; if the account is already gone, returns `false` (idempotent no-op).
2. An explicit `DELETE` per store below, in this order (credentials first).
3. `DELETE FROM users`.

Any failure rolls everything back (tested by forcing the final delete to fail). `ON DELETE CASCADE` stays in the
schema as a safety net, not as the mechanism. `user-data-register.test.ts` fails the build if a table or a
foreign key to `users` appears that is not in the register.

## Matrix

| Data (table)                         | Delete | Anonymise | Retain | Reason                                                                                            | External cleanup                                                                                                                                   |
| ------------------------------------ | :----: | :-------: | :----: | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sessions`                           |   ✔    |           |        | Security credential; deleting it ends every session on every device                               | —                                                                                                                                                  |
| `email_verification_tokens`          |   ✔    |           |        | Security credential                                                                               | —                                                                                                                                                  |
| `password_reset_tokens`              |   ✔    |           |        | Security credential                                                                               | —                                                                                                                                                  |
| `newsletter_subscriptions`           |   ✔    |           |        | Consent record; deletion stops marketing and makes every unsubscribe link a harmless no-op        | Email provider: none connected (fake). **PENDING** with ADR-014: suppression/contact deletion at the provider                                      |
| `teacher_students` (both directions) |   ✔    |           |        | A deleted student disappears from rosters; a deleted teacher's links go, students keep their data | —                                                                                                                                                  |
| `student_profiles`                   |   ✔    |           |        | Personal data with no retention need                                                              | —                                                                                                                                                  |
| `lesson_progress`                    |   ✔    |           |        | Learning record                                                                                   | —                                                                                                                                                  |
| `exercise_attempts`                  |   ✔    |           |        | Learning record (includes free-text answers)                                                      | —                                                                                                                                                  |
| `point_transactions`                 |   ✔    |           |        | Ledger is immutable against UPDATE only; DELETE was kept for this workflow (M8)                   | —                                                                                                                                                  |
| `user_achievements`                  |   ✔    |           |        | Learning record                                                                                   | —                                                                                                                                                  |
| `user_vocabulary`                    |   ✔    |           |        | Learning record                                                                                   | —                                                                                                                                                  |
| `user_phonetic_progress`             |   ✔    |           |        | Learning record                                                                                   | —                                                                                                                                                  |
| `video_generation_jobs`              |   ✔    |           |        | Request record                                                                                    | Rendered file is per content definition, not per user — nothing to delete. A job still rendering finishes and its update finds no row (no effect). |
| `users`                              |   ✔    |           |        | The account itself, deleted last                                                                  | —                                                                                                                                                  |

## What account deletion does **not** reach

| Place                                     | Content about the user                                                   | Status / action required                                                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| API logs                                  | IP per request; user id in some events (incl. `privacy.account_deleted`) | Log retention depends on hosting — **PENDING** (ADR-015). Kept deliberately: the deletion event is the minimal record that the request was honoured. |
| `FakeEmailProvider` memory                | Up to 500 recent emails (address, body with tokens)                      | Cleared on restart / evicted. The fake is not meant for real users; replacing it (ADR-014) removes this. **Documented limitation.**                  |
| Email provider (future)                   | Address, message history, suppression lists                              | **PENDING** provider selection and contract; the adapter must implement contact deletion/suppression where the provider supports it.                 |
| Gemini (if enabled)                       | None about the user (catalog text only)                                  | —                                                                                                                                                    |
| Database backups / point-in-time recovery | Whatever the host keeps                                                  | **PENDING** hosting/DB provisioning (Neon never provisioned): backup retention decides how long deleted rows survive in backups.                     |
| The user's own downloaded export          | Everything exported                                                      | The user's own copy.                                                                                                                                 |

Deleting local database data does **not** delete provider-side copies; this is stated in the privacy notice for
logs and will need restating for any real provider.

## Semantics that are deliberately separate

- **Unsubscribe ≠ deletion.** Unsubscribing keeps the account and the consent record (`unsubscribed`); the UI
  points to it as the lighter option.
- **Deletion ≠ consent withdrawal.** Deletion removes the consent record altogether.
- **Logout ≠ deletion.** Logout revokes one session.

## Idempotency and enumeration

- The use case returns `{ deleted: false }` for an account that is already gone; the store returns `false` without
  touching anything. Over HTTP a repeated request is `401` (the session no longer exists).
- The route takes no user id or email, so it cannot reveal whether another account exists.
