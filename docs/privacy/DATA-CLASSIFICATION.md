# Data classification

Status: ACCEPTED (M15, [ADR-026](../adr/adr-026-privacy-data-management.md)). Not legal advice — see the
[disclaimer](README.md).

A lightweight **engineering** label, defined in code as `DATA_CLASSIFICATIONS`
(`packages/domain/src/privacy/data-classification.ts`) and applied per table in `USER_DATA_REGISTER`
(`packages/data/src/privacy/user-data-register.ts`). It is not a legal category: `PERSONAL` means "about an
identifiable user", and **no learning data is treated as a GDPR special category** — nothing in the current
product collects health, biometric, ethnic, religious or similar data.

## Classes

| Class                | Meaning                                               | Examples in this codebase                                                                                  |
| -------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `PUBLIC`             | Published content anyone may read                     | Languages, levels, published lesson/vocabulary/phonetics content                                           |
| `INTERNAL`           | Operational data about the system, not about a person | `video_generation_jobs.provider_job_reference`, `media_reference` (server path), migration tables          |
| `PERSONAL`           | Data about an identifiable user                       | `users.email`, profile names, progress, attempts (including free-text answers), points, consent records    |
| `SECURITY_SENSITIVE` | Credentials and their derivatives                     | `users.password_hash`, `sessions`, verification/reset tokens, `unsubscribe_key`, `confirmation_token_hash` |

## Rules each class drives

| Rule                 | PUBLIC        | INTERNAL             | PERSONAL                                            | SECURITY_SENSITIVE                  |
| -------------------- | ------------- | -------------------- | --------------------------------------------------- | ----------------------------------- |
| API responses        | yes           | never                | owner only (teachers: allowlisted subset, M13)      | never                               |
| Personal-data export | —             | no                   | **yes** (`isExportableClassification`)              | **never**                           |
| Logs                 | yes           | yes (ids)            | user id only where needed for audit; never contents | **never**                           |
| Account deletion     | —             | deleted with the row | deleted (see [matrix](DATA-DELETION-MATRIX.md))     | deleted first                       |
| Storage              | content files | DB                   | DB, per-context table, FK to `users`                | hashes only (no raw token/password) |

## Enforcement (tests, not conventions alone)

- `user-data-register.test.ts` fails if a table or a foreign key to `users` exists that the register does not
  classify, and asserts which stores are `SECURITY_SENSITIVE`.
- The export read model selects explicit column lists; its test asserts no hash, token, key, provider reference or
  file path appears in the output.
- The export contract (`personalDataExportSchema`) strips any field outside the documented shape.
- The error log serializer is an allowlist and scrubs SQL parameters (`error-serializer.test.ts`).

## Adding data

Before adding a column or table holding user data, record: purpose, data, storage, who can access it, deletion
behaviour, external recipients — then classify it in `USER_DATA_REGISTER` (the guard test will insist) and add it
to the export if it is `PERSONAL`.
