# Conventions

## TDD (mandatory)

RED → GREEN → REFACTOR for every feature. Full 14-step process:
[docs/testing/tdd-workflow.md](../docs/testing/tdd-workflow.md). No implementation before a
failing test exists for it (except genuinely non-testable scaffolding like a pure type).

## Testing

Vitest + RTL for unit/component, Playwright for E2E, ~80/20 split. Coverage baseline: Lines ≥80%,
Statements ≥80%, Functions ≥80%, Branches ≥75% — but critical flows (auth, authorization,
scoring, lesson completion, points, profile changes, destructive ops, teacher/student permission
boundaries) are tested regardless of whether the percentage target is already met. Detail:
[docs/testing/testing-strategy.md](../docs/testing/testing-strategy.md).

Practical setup since M1: one root `vitest.config.ts` (`test.projects`) aggregates every
package/app's own `vitest.config.ts` (built via the shared `vitest.shared.ts` helper) — `pnpm
test` runs everything in one process; `pnpm --filter @tfm-bic/<pkg> test` runs just one project.
RTL's auto-cleanup does **not** register itself (`vitest.shared.ts` sets `globals: false`), so any
new `vitest.config.ts` with `environment: "jsdom"` needs a `setupFiles` entry that imports
`@testing-library/jest-dom/vitest` and calls `afterEach(cleanup)` explicitly — see
`apps/web/src/test-setup.ts` for the pattern.

## Git

Branches: `main` (protected) + `develop` + `feature/`, `fix/`, `test/`, `refactor/`, `docs/`,
`ci/`, `chore/`, `build/`, `perf/`, `hotfix/` — kebab-case, one coherent change per branch.
Detail: [docs/development/git-branching-strategy.md](../docs/development/git-branching-strategy.md).

## Commits

`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `ci:`, `chore:`, `build:`, `perf:`, `hotfix:` —
small, atomic, one intention each.
Detail: [docs/development/commit-convention.md](../docs/development/commit-convention.md).

## CI/CD (since M2)

`Jenkinsfile` + `sonar-project.properties` (repo root) — stages, reproducibility decisions, and
troubleshooting: [docs/deployment/ci-cd-pipeline.md](../docs/deployment/ci-cd-pipeline.md). A local
Jenkins/SonarQube exist (WSL Docker) but a green build was not confirmed — see
[current-state.md](current-state.md). Reproduce the same
gates locally before pushing: `pnpm check` (lint/format/typecheck/test/build) + `pnpm test:e2e`.
Whenever `@playwright/test` is upgraded, the Playwright Docker image tag in the `Jenkinsfile` must
be bumped to match in the same commit, or the E2E stage breaks.

## Code style

TypeScript strict mode everywhere, no `any`. No business logic in React components (belongs in
domain/application, invoked via hooks/services). No business logic in API route handlers (thin
controllers only). No per-language `if` branching — parameterize by `languageId` (enforced by
`packages/data/src/content/no-language-branching.test.ts`).

## Data, API and client-state conventions (since M4)

Rationale: [ADR-017](../docs/adr/adr-017-student-profile.md).

- **One bounded context = its own schema file, connection factory and migration folder** under
  `packages/data/src/<context>/` (`identity/`, `profile/`). A context whose tables reference
  another's keeps its own migration-tracking table (`migrations.table` in its drizzle config) and
  its tests apply migrations in dependency order.
- **User-owned data is reached only through the session.** Routes take the user from
  `request.currentUser`, never from a URL/query/body id; no `:id` routes for "my own" data. Request
  schemas are `.strict()`, use-case input types carry no auth/role fields, and fields are mapped
  one by one — never spread from a body.
- **A `GET` never writes.** Create-on-first-write with one atomic upsert.
- **Every cached TanStack Query except `["auth", …]` and the public `["catalog", …]` (M5) is
  user-scoped** and is dropped on logout/login (`apps/web/src/hooks/session-cache.ts`). Never cache another user's data under an
  `auth` key, and never put user data in Zustand.
- **Names/free text**: trim only — no case folding, diacritic stripping or alphabet allow-lists
  (the product is multilingual). Reject control characters; treat markup-looking text as inert data
  and rely on output escaping.

## Content and catalog conventions (since M5)

Rationale: [ADR-018](../docs/adr/adr-018-content-languages.md); reference:
[content-architecture.md](../docs/architecture/content-architecture.md).

- **Content is data** under `content/languages/<code>/` — one `language.json` per language and one
  JSON file per content item (file name = id). Never hard-code language names, codes or educational
  text in React, use cases or routes. A new language or level is files + `pnpm content:validate`.
- **One schema system**: Zod in `packages/contracts` defines both the on-disk format and the API
  shapes, built from the domain's own predicates. Content strings are plain text (no markup, no
  control characters); block types are a closed set mapped to fixed UI components.
- **Ids are permanent** and language-prefixed (`pl-greetings`); retire content by `status: archived`,
  never by renaming. Ordering is the explicit `order` field.
- **Visibility rules live in application use cases**, not repositories or the UI: active languages,
  `available` levels, `published` content only; every hidden-content outcome is the same `404`.
- **Public catalog routes** (`/languages`, `/content`) are unauthenticated and read-only. Web pages that
  would share an API path get a different path (`/learn`) instead of another proxy bypass.
- **Catalog queries** use the key root `["catalog", …]`: the one cached data that is _not_ user-scoped,
  so `clearUserScopedCache` keeps it (with `["auth", …]`).
- `pnpm content:validate` runs in Jenkins right after install and before lint.

## Lesson conventions (since M6)

Rationale: [ADR-019](../docs/adr/adr-019-lessons.md).

- **A lesson is content, not a new record.** It is a content item with `type: "lesson"`, identified by its
  `ContentId`. Never add a lessons table, a slug, a second id or a per-language lesson class. **Content and
  progress stay apart**: the files own the lesson; PostgreSQL owns only `lesson_progress`.
- **Reuse visibility, don't restate it.** Lesson use cases are built on `GetContentUseCase` /
  `ListContentUseCase`; every "cannot see it" reason is one `LessonNotFoundError` / `404`.
- **Progress transitions live in the domain** (`startLesson`, `completeLesson`: forward-only, idempotent) and are
  applied by _atomic_ repository operations (one upsert each), never read-then-write. Times come from the `Clock`.
- **Action routes take no body** (strict empty schema): a client can never set the user, a time or a status.
  Lesson responses are `private, no-store`. "Not started" is derived, never stored.
- **Pages that would share an API path get another path** — lesson pages are under `/learn/lessons`. Query keys
  for lessons use the user-scoped root `["lessons", …]`. A mutation the student can double-click keeps one request
  in flight (a disabled button alone is not enough).
- Status is always stated in words, never by colour alone; primary buttons use navy text on the accent (AA).

## Exercise conventions (since M7)

Rationale: [ADR-020](../docs/adr/adr-020-exercises.md); reference:
[exercise-architecture.md](../docs/architecture/exercise-architecture.md).

- **An exercise is content, not a record**: a validated file under `levels/<level>/exercises/`, tied to a lesson. Never add
  an exercises table, a per-language exercise class, controller or page. Only `exercise_attempts` is stored.
- **Content, evaluation and presentation are separate.** Configuration is data; evaluators are pure code
  (`parseAnswer` + `evaluate`, no HTTP/React/DB/clock, no mutation); presenters build what a student may see field by
  field. **No `if (type === …)` chain** — dispatch goes through `ExerciseTypeRegistry`; a new type is a module per
  layer plus one registry line each, and no other type's code changes.
- **The server is authoritative.** The client sends `{ answer }` and nothing else (strict schema); it never names an
  evaluator, a user, a verdict, a score or a time. Never put an answer key in a response before an answer, and add a
  test on the raw body when you touch a response.
- **Malformed answers are refused, not judged** (`400`, no attempt). **Every well-formed submission is an attempt**;
  attempts are append-only (no update/delete path), retries never touch earlier ones, the latest result is derived
  (`summarizeAttempts`), and nothing is computed for points/streaks/adaptive features yet.
- **Text answers**: NFC + trim + language-aware lower-casing only when not case-sensitive; never strip diacritics or
  punctuation; variants are listed explicitly; no fuzzy matching.
- **Never log a submitted answer.** Pages that would share an API path get another path (`/learn/exercises`); query
  keys use the user-scoped root `["exercises", …]`; a submission the student can double-click keeps one request in
  flight; the verdict is shown in words (never colour alone) and focus moves to it.
- Web: no `dangerouslySetInnerHTML`/`innerHTML`/`eval`/computed dynamic import (`no-raw-html.test.ts`).

## Dependencies

Never install "latest" blindly — check stable version, Node/TS compatibility, peer deps, breaking
changes, security advisories, then test/lint/typecheck/build before committing. Full checklist:
[docs/development/dependency-management.md](../docs/development/dependency-management.md).

## Anti-hallucination (applies to Claude's own output, not just code)

No invented APIs/SDKs/versions/pricing/limits/legal requirements. Unverifiable → `UNKNOWN`.
Multiple valid options → `OPTION A/B/C` with trade-offs, not a silent pick. Detail:
[.claude/skills/anti-hallucination/SKILL.md](skills/anti-hallucination/SKILL.md).
