# ADR-026: Privacy & data management — export, account deletion, privacy logging

Status: ACCEPTED (technical design) / PENDING (legal review of bases, retention, roles, transfers, notice wording)
Date: 2026-09-26

Not legal advice. See [docs/privacy/README.md](../privacy/README.md) for the disclaimer and the full inventory.

## Context

Before M15 there was no account deletion, no data export, no privacy notice and no inventory of personal data; every
user-owned table merely cascaded from `users`. Newsletter consent already existed as its own record (M14,
ADR-025). Inspection also found that the global error handler logged Drizzle query errors verbatim — including bound
parameters (email addresses, password and token hashes) and Postgres `detail` strings.

Decisions taken with the product owner on 2026-09-26: **immediate hard delete**; deletion **re-checks the current
password**; **structured logs only** for privacy audit events (no audit table); the notice shows a visible
**PENDING** placeholder for controller identity/contact.

## Decision

1. **A Privacy context** (domain → application → data → API → web), no new tables, no migration.
   - Domain: `DATA_CLASSIFICATIONS`, `UserDataRegisterEntry` + `validateUserDataRegister` (a `retain`/`anonymise`
     disposition needs a documented reason), `PERSONAL_DATA_EXPORT_VERSION`, date-only export file name.
   - Application: ports `PersonalDataReadModel` and `AccountErasureStore`; `ExportPersonalDataUseCase`;
     `DeleteAccountUseCase` (reuses Identity's `UserRepository` and `PasswordHasher` — no second auth path).
   - Data: `USER_DATA_REGISTER` (every table, its user columns, class and disposition);
     `DrizzleAccountErasureStore`; `SqlPersonalDataReadModel`; a small pool of its own (`max: 2`).
2. **The register is guarded by the schema.** A test compares it with `information_schema` and `pg_constraint`: a
   new table or foreign key to `users` fails the build until someone decides what deletion does to it.
3. **Deletion is explicit, transactional and idempotent.** Lock the user row (`FOR UPDATE`), `DELETE` each registered
   store in order (credentials first), then `users`; all or nothing. `ON DELETE CASCADE` stays only as a safety net.
   An absent account is a no-op (`deleted: false`).
4. **Export is synchronous JSON, version 1**, read in one `REPEATABLE READ, READ ONLY` transaction with explicit
   column lists, mapped field by field, and stripped again by the contract schema. `GET /data-management/export`:
   `private, no-store`, `nosniff`, `attachment`, date-only file name, 5/hour. No queue, no stored file, no URL.
5. **API under `/data-management/*`** (the page `/privacy` would otherwise clash with an API path, ADR-017). No user
   id anywhere; strict schemas (`{ password, confirm: true }`); Origin check on the POST; 5/hour; `204` + cleared
   cookie on success; `403` on a wrong password.
6. **Controls consolidated on `/profile`** (profile form = rectification, email preferences = consent withdrawal,
   "Your data" = export and deletion). Public `/privacy` (notice) and `/account-deleted`.
7. **Privacy notice as versioned content** (`apps/web/src/legal/privacy-notice.ts`, `privacy-policy-v1`), marked a
   draft pending legal review; version ids are never reused. **No acknowledgement is recorded** (PENDING decision) —
   it is distinct from newsletter consent, whose own text version M14 already records.
8. **Audit = structured log events**: `privacy.data_export_generated`, `privacy.account_deletion_refused`,
   `privacy.account_deleted` (user id only). Never contents, passwords, cookies.
9. **Log scrubbing**: an allowlist `err` serializer (type, message and stack with SQL parameters redacted, `code`,
   `statusCode`, short `cause` chain — never `params` or `detail`) and a Pino `logMethod` hook that scrubs messages.

## Options considered

- **Rely on `ON DELETE CASCADE`** — one statement, but the decision per table is implicit and a new table without a
  cascade (or with data that must be retained) would be silently wrong. Rejected in favour of the explicit register +
  guard test.
- **Soft delete / grace period** — requires inventing a retention period and a scheduled purge. Rejected by the
  product owner; the register can express it later with a reason.
- **Asynchronous export (job + download link)** — needs storage, expiring URLs and possibly a queue; unjustified for
  per-user data bounded by content size.
- **`audit_events` table** — raises its own retention question (keeping a deleted user's id). Deferred; logs are the
  existing mechanism.
- **Recording notice acknowledgement at registration** — not required by any established product rule; would be a
  legal assumption. PENDING.
- **A generic GDPR/consent framework** — out of scope; M14's consent record is reused as is.

## Consequences

- Users can export and delete their data without contacting anyone; teachers lose access to deleted students at once.
- Logs, backups and any future provider-side copies are outside the application's reach — documented in the
  deletion matrix and the notice.
- `buildServer` takes a 14th argument (`privacyDeps`).
- Restriction/objection workflows, email change and a contact channel remain unimplemented (see the processing
  register's rights table).

## References

- [docs/privacy/](../privacy/README.md) — data map, register, deletion matrix, export format, flows, third parties,
  teacher access, risk assessment, sources.
- ADR-006 (sessions), ADR-017 (session-scoped routes, page/API paths), ADR-024 (teacher access), ADR-025 (consent).
