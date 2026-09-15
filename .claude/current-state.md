# Current State

Last updated: 2026-09-15

## Milestone

**M0 — Architecture, Project Constitution and Development Governance** — complete as of this
update. See M0 deliverables list against
[docs/product/project-constitution.md](../docs/product/project-constitution.md).

## What actually exists

- Full documentation set: constitution, architecture/domain/content-architecture docs, 15 ADRs,
  testing/TDD strategy, security/privacy baseline, CI/CD design, git/commit/dependency/Husky
  policy, MVP definition, roadmap, risk register.
- Monorepo folder skeleton (`apps/`, `packages/`, `content/languages/pl/...`, `infrastructure/`,
  `tests/`, `.claude/skills|agents|commands`) — **placeholder READMEs only, no code, no
  `package.json`, no installed dependencies.**
- `.claude/skills/` — 19 skills, listed in [conventions.md](conventions.md).

## What does NOT exist yet (do not assume otherwise)

- No `package.json` / workspace tooling anywhere.
- No React app, no API server, no database connection, no auth.
- No Hyperframes or Gemini integration code (architecture only — see ADR-012/013).
- No real lesson/vocabulary content (folder skeleton only, under `content/languages/pl/`).
- No CI pipeline actually running (Jenkinsfile not written — design only, see
  [docs/deployment/ci-cd-pipeline.md](../docs/deployment/ci-cd-pipeline.md)).

## Pending decisions blocking implementation

Backend framework version (ADR-004), DB provider (ADR-005), session mechanism (ADR-006), email
provider (ADR-014), hosting/deploy target (ADR-015). Check
[docs/adr/README.md](../docs/adr/README.md) for current status before assuming any of these are
settled.

## Next milestone

Not started. Per the constitution, M1 should not begin until the M0 acceptance criteria are all
satisfied (see project-constitution.md and the M0 brief's own acceptance-criteria list).
