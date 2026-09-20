# Project Context

Language-learning platform (first language: Polish, architected for many more). Modular
monolith, TypeScript monorepo, Clean/Hexagonal layering. **Milestones 0–4 complete**
(architecture/governance, monorepo/tooling, CI/CD, Identity & Authentication, Student Profile) —
see [current-state.md](current-state.md) for what that means concretely.

## Quick facts

- Repo: `pvsegura/TFM-BIC` on GitHub, `main` branch protected, `develop` for integration; M3 was
  built on `feature/authentication`, M4 on `feature/student-profile` (branched from it).
- Stack: React/Vite/TS (frontend), Node/TS/Fastify (backend), PostgreSQL — Neon (provider,
  ACCEPTED, account provisioning deferred) accessed via Drizzle ORM, Jenkins + SonarQube for
  CI/CD/quality.
- No AWS, anywhere, ever.
- External AI services: Hyperframes (video, self-hosted OSS) and Gemini API (audio TTS, Preview
  status) — both isolated behind service interfaces, neither implemented yet (later milestone).
- TDD is mandatory (RED/GREEN/REFACTOR) for all feature work.
- Authentication (M3): server-managed sessions via a signed HttpOnly/SameSite=Strict cookie,
  Argon2id password hashing, email verification + password reset with single-use expiring
  tokens, STUDENT/TEACHER role model — see [ADR-006](../docs/adr/adr-006-authentication.md).
- Student Profile (M4): first/last name, nickname and a predefined avatar (no upload), in its own
  `student_profiles` table keyed to `users`; identity (email, role) stays on `users`. The two
  routes `GET /profile` and `PATCH /profile` act only on the session's user — see
  [ADR-017](../docs/adr/adr-017-student-profile.md).

## Where things live

- Full architecture: [docs/architecture/](../docs/architecture/)
- Decisions: [docs/adr/](../docs/adr/) — check status (`ACCEPTED` vs `PENDING`) before assuming a
  decision is final.
- Product scope: [docs/product/](../docs/product/)
- Current milestone status: [current-state.md](current-state.md)
- Conventions (git, commits, testing, layering rules): [conventions.md](conventions.md)
- Full architecture summary for quick recall: [architecture.md](architecture.md)

## Read this first, every session

[current-state.md](current-state.md) — tells you what milestone is active and what's actually
been built vs. only documented.
