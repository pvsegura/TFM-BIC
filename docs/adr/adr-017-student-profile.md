# ADR-017: Student Profile, avatar catalog and per-context migrations

Status: ACCEPTED
Date: 2026-09-20 (M4 — Student Profile)

## Context

M4 lets an authenticated student view and edit their first name, last name, nickname and avatar.
[domain-model.md](../architecture/domain-model.md) already separates **Student Profile** from
**Identity & Authentication** (and names **Media** as owner of the avatar catalog), but neither had
code, and several things had no precedent to copy: where the avatar catalog lives, how a second
bounded context's tables and migrations sit next to Identity's, how "empty" values behave, and how
the profile API coexists with a page at the same path.

## Decision

### Data model

One table, `student_profiles`, keyed by `user_id` (primary key **and** foreign key to `users.id`,
`ON DELETE CASCADE`): `first_name`, `last_name`, `nickname` (nullable text), `avatar_id` (nullable
text), `created_at`, `updated_at`. There is no surrogate id (the relationship is strictly 1:1) and
**no copy of email or role** — those stay on `users` and are joined in at the API layer from the
authenticated identity. `CHECK` constraints mirror the domain rules (length bounds, no surrounding
spaces) as defense in depth against any writer that bypasses the application.

### API

`GET /profile` and `PATCH /profile`, both acting **only** on the session's user
(`request.currentUser`); there is deliberately no `:id` route. `PATCH` validates with a `.strict()`
Zod schema, so any key other than the four editable fields (`role`, `userId`, `email`,
`emailVerified`, …) is a `400`, and each field is mapped explicitly (never spread). The response is
parsed through an allowlisting schema. `GET` never writes (an unsaved profile is returned as nulls);
`PATCH` is a single atomic `INSERT … ON CONFLICT (user_id) DO UPDATE` that creates the row on first
save, so concurrent first saves cannot race and each only overwrites its own columns. The body is
capped at 4 KB.

### Validation and empty values

First/last name: trimmed, 1–100 characters. Nickname: trimmed, 2–30 characters. Both reject control
characters (including CR/LF/NUL) and nothing else — no alphabet allow-list, no case or diacritic
changes, so `Łukasz` and `李小龙` are stored exactly. HTML- or SQL-looking text is **stored as
inert text**, not stripped or rejected: React escapes on render and queries are parameterized, and
rejecting punctuation would reject real names.

A text field in a `PATCH` body is **omitted** (unchanged), **`null`** (cleared) or a **valid
string**. An empty or whitespace-only string is a `400` — it is never stored and never silently
turned into `null`. The web form treats a blank input as "no value" and sends `null` (the one place
that convention is translated). An avatar can be replaced but not cleared.

### Avatar catalog

A small static list (`avatar-01`…`avatar-06`, with labels) in `packages/domain/src/media/` — the
Media context, kept separate from Student Profile. `packages/contracts` builds the `avatarId` enum
from it and re-exports it, because `apps/web` depends on contracts but not on domain; the picker
therefore renders the single source of truth with no extra request. How an avatar _looks_ is a
presentational id→glyph map in `packages/ui` (emoji, so no image assets, upload path or storage),
and a test fails if the catalog gains an avatar the UI has no glyph for. The database column is
deliberately unconstrained text, so adding an avatar never needs a migration; a stored id that later
leaves the catalog reads back as "no avatar".

### Persistence and migrations

Student Profile gets its own schema file, connection factory and migration folder
(`packages/data/src/profile/`), mirroring Identity's, so **no M3 file in `packages/data` changed**.
It opens a small separate `pg` pool over the same `DATABASE_URL` (one database, no new env var).
Its migrations record progress in their **own tracking table** (`__drizzle_migrations_profile`):
drizzle-orm's migrator reads only the single most recent recorded `created_at` and applies
migrations newer than it (verified in `drizzle-orm@0.45.2`, `pg-core/dialect.js`), so sharing
Identity's table could silently skip a profile migration generated before a later Identity one. On
a fresh database run Identity's migration first (`db:migrate`), then `db:migrate:profile`, because
of the foreign key. Tests boot one PGlite instance with both sets applied in that order;
`NODE_ENV=test` shares that single instance between auth and profile (the FK requires the same
database).

### Frontend

Profile data is TanStack Query server state (key `["profile","me"]`), not Zustand. A save writes
the server's persisted `PATCH` response into the cache. **Every cached query except `["auth", …]`
is treated as user-scoped and is dropped on logout and on login**; without this, M3's logout left
the previous user's cached data available to the next person signing in on the same tab. A `401`
from a profile request marks the session ended so `ProtectedRoute` redirects to login. The form
validates by piping its values through the shared request schema (no rules re-declared in the UI).

### The `/profile` path is both a page and an API

The brief specifies the API at `/profile` and the page at `/profile`. Both are same-origin behind
the Vite dev proxy, so the proxy serves the SPA for browser navigations (`Sec-Fetch-Dest:
document` or `Accept: text/html`) and forwards the app's own `fetch` (always
`Accept: application/json`) to the API. **Any reverse proxy in front of production must make the
same distinction** — this is recorded for the deployment milestone (ADR-015 is still PENDING).

## Options considered

- **Profile columns on `users`** — rejected: the domain model keeps identity and profile apart, and
  a profile change would then touch the authentication table.
- **Avatar catalog as a DB table / `content/` JSON behind a repository** — rejected as
  over-engineering for a fixed set that does not vary per user; revisit if avatars ever become
  data-managed.
- **Avatar catalog served by an API endpoint** — rejected: an extra request for static data, and it
  would need a second source of truth or client-side duplication.
- **A `CHECK (avatar_id IN (…))` constraint** — rejected: it would duplicate the catalog into SQL
  and require a migration to add an avatar.
- **Share one connection pool / one migration set with Identity** — rejected: it would touch M3
  files and couple the two contexts' migration histories.
- **Create the profile row on `GET` (or at registration)** — rejected: side effects on a `GET`, and
  registration is M3's use case.
- **Silently turn blank strings into `null` on the server** — rejected: an explicit `null` keeps the
  API unambiguous.
- **API under a prefix (e.g. `/api/profile`) or the page at another path** — rejected for M4
  because the brief fixes both paths; the proxy rule above is the cost.

## Consequences

- Two `pg` pools per API process (identity, profile) instead of one — cheap, and it preserves
  context isolation.
- Profile routes have no rate limit (they are authenticated and touch only the caller's own row);
  add one if abuse appears.
- No unsaved-changes navigation guard: M3 has no equivalent UX, and Save is disabled until the form
  is dirty.
- Names such as `<script>…` are accepted and stored; every consumer must escape on output. Nothing
  renders them as HTML today, but a future HTML email or PDF that interpolates a name must escape it.
- Unexpected database errors are logged by the central error handler; in the rare case of a
  constraint violation the driver's `detail` can include row values. Validated input cannot reach
  that path, but log retention should be considered when logging is centralized.

## References

- [domain-model.md](../architecture/domain-model.md) — Student Profile and Media contexts
- [ADR-005](adr-005-database.md) — Drizzle and PGlite
- [ADR-006](adr-006-authentication.md) — sessions, CSRF, server-side authorization
- [security-baseline.md](../security/security-baseline.md), [privacy-gdpr.md](../security/privacy-gdpr.md)
