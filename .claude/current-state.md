# Current State

Last updated: 2026-09-20

## Milestone

**M5 — Content & Languages** — implemented on `feature/content-languages`, branched from
`feature/student-profile` (M4), which sits on `feature/authentication` (M3) and `ci/jenkins-sonarqube`
(M1+M2); `main` only has M0. **Nothing from M5 has been pushed or merged.** M0–M4 remain the base
(architecture/governance, monorepo/tooling, CI/CD, authentication, student profile — see
[docs/product/project-constitution.md](../docs/product/project-constitution.md)).

## What actually exists (M5)

The language/level/content foundation. Rationale and trade-offs: [ADR-018](../docs/adr/adr-018-content-languages.md);
reference and the "add a language" steps: [content-architecture.md](../docs/architecture/content-architecture.md).

- **Source of truth**: validated JSON under `content/languages/<code>/` — `language.json` (metadata +
  which CEFR levels exist, `available` | `planned`) and `levels/<id>/content/<contentId>.json` (one item
  per file). No database tables, migrations or seeds in M5; no copy anywhere else.
- **Domain**: `Language`, `LanguageLevel`, the `CEFR_LEVELS` constant (`a1`…`c2`), `ContentItem` with
  structured blocks (`explanation`, `example`, `dialogue`), `ContentId`, ordering, and
  `validateContentCatalog` (cross-file rules).
- **Contracts**: one Zod system for the strict on-disk format and the allowlisting API shapes.
- **Application**: `ContentRepository` port; `ListLanguages`, `ListLanguageLevels`, `ListContent`,
  `GetContent` enforce visibility (active languages, `available` levels, `published` content, explicit
  order) — the repository is storage only.
- **Data**: `FileSystemContentRepository` (reads + validates everything at API start-up, fails fast) and
  `pnpm content:validate` (same loader; a Jenkins stage after install).
- **API** (public, read-only, rate-limited 120/min): `GET /languages`, `/languages/:languageCode/levels`,
  `/content?language=&level=`, `/content/:contentId`. Optional `CONTENT_DIR` env var.
- **Frontend**: `/learn`, `/learn/:languageCode`, `/learn/:languageCode/:levelId` (one generic page) and
  `/learn/:languageCode/:levelId/:contentId` (read-only content view); reusable `LanguageSelector`,
  `LevelSelector`, `ContentList`, `ContentBlocks`. Planned levels are visible but not selectable.
  "Learn" nav link. Catalog queries (`["catalog", …]`) survive logout.
- **Polish A1 seed**: five original items (greetings; introducing yourself with a dialogue; polite
  words; Polish has no articles; first look at spelling and sounds). Representative only — **not** a
  complete A1 course and not CEFR-certified. A2–C2 are `planned`.
- **Extensibility proof**: fictional languages (`xx`, `qq`, one RTL) served by the unmodified use cases,
  storage and routes; `no-language-branching.test.ts` scans production source for per-language logic.
- **Not stored**: the student's selected language/level (URL only) — enrolment belongs to M6.

## Verification (M5, run locally on 2026-09-20)

- `pnpm install --frozen-lockfile`, `pnpm content:validate` (1 language, 5 items), `lint`, `typecheck`,
  `build`: pass. `format:check`: passes for everything committed (the user's separate uncommitted
  `README.md` edit is not formatted).
- **1107 Vitest tests / 110 files** pass (637 / 75 at end of M4): domain 238, contracts 265, application
  87, data 122, config 12, api 155, web 198, ui 29, shared 1. Coverage: 95.81% statements / 89.44%
  branches / 96.51% functions / 95.66% lines (thresholds 80/75/80/80).
- **46 Playwright E2E tests** pass (25 earlier + 21 in `tests/e2e/content-languages.spec.ts`). Ports 3000
  and 5173 must be free (`reuseExistingServer`).
- **Jenkins pipeline and SonarQube analysis / Quality Gate: NOT RUN for M5.** The branch is not on
  GitHub, and there are no Jenkins/SonarQube credentials in this environment (see the M4 note below).
  The new "Content Validation" stage and the extra `sonar.coverage.exclusions` entry
  (`validate-content.cli.ts`, mirrored in `vitest.config.ts`) are untested against a real instance.
- Accessibility rests on role/label/keyboard tests and manual review; there is no axe-style scanner.
- CEFR level names and ISO 639-1 codes were confirmed from search-result summaries (coe.int and loc.gov
  returned 403 to direct fetches); Polish facts were cross-checked against several references (ADR-018).

## Earlier milestones (short)

- **M4 (student profile)**: `GET`/`PATCH /profile` on the session user only, `student_profiles` table,
  avatar catalog — [ADR-017](../docs/adr/adr-017-student-profile.md). Its branch was pushed on
  2026-09-20 (publishing M3 too); a local Jenkins (Multibranch `TFM-BIC`, containers in WSL Ubuntu) and
  SonarQube exist but no build result was ever read back.
- **M3 (auth)**: register/verify/login/logout/reset, server-side sessions, Argon2id, rate limits, `Origin`
  CSRF check, in-memory email only — ADR-006, [security-baseline](../docs/security/security-baseline.md).

## What does NOT exist yet (do not assume otherwise)

- Lessons as an experience, exercises, scoring/progress, vocabulary/phonetics content, gamification,
  teacher dashboard, subscriptions, newsletter, account deletion/data export, AI services.
- More than one real language, or any level beyond Polish A1; CEFR descriptors; interface localisation
  (the UI is English-only; `instructionLanguage` is data, not behaviour).
- Persistence of a student's chosen language/level; content hot-reload (content is read at start-up).
- A real email provider (ADR-014); a real Neon connection was never exercised (Docker Postgres in dev,
  PGlite in tests).
- Automated accessibility checks (axe); CSRF double-submit token; a dependency-audit CI step.

## Pending decisions

None block M6. Hosting/deploy ([ADR-015](../docs/adr/adr-015-deployment.md)) is PENDING; note that a
deployment must now ship `content/` with the API or set `CONTENT_DIR`.

## Known risks / rough edges

- **Content changes need a restart/release** (read once at start-up); invalid content stops the API from
  starting (by design).
- **Public endpoints**: rate-limited but unauthenticated — they must never return anything not fine for
  anyone to read. Gating content bodies later (subscriptions) is a deliberate route change.
- **`/profile` is both page and API path** (only the Vite dev proxy separates them; ADR-017). M5 avoided
  repeating this by using `/learn` for pages.
- A first Playwright run once timed out (60s) waiting for the servers with both ports free; a rerun
  passed. Not reproduced since.
- Profile routes have no rate limit; no unsaved-changes guard; names stored as typed (escape on output).
- Two `pg` pools per API process (identity, profile); real Neon connectivity unverified.
- `E2E_RELAXED_RATE_LIMITS` raises (not removes) rate limits for E2E only, now for the catalog routes too.
- Session/token secrets fall back to an ephemeral value in dev/test when `AUTH_SESSION_SECRET` is unset.

## Next milestone

`M6 — Lessons` (not started).
