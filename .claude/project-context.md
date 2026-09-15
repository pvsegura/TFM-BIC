# Project Context

Language-learning platform (first language: Polish, architected for many more). Modular
monolith, TypeScript monorepo, Clean/Hexagonal layering. Currently in **Milestone 0**
(architecture/governance) — no feature code implemented yet.

## Quick facts

- Repo: `pvsegura/TFM-BIC` on GitHub, `main` branch protected, `develop` for integration.
- Stack: React/Vite/TS (frontend), Node/TS (backend, framework PROPOSED as Fastify, not final),
  PostgreSQL (provider PENDING), Jenkins + SonarQube for CI/CD/quality.
- No AWS, anywhere, ever.
- External AI services: Hyperframes (video, self-hosted OSS) and Gemini API (audio TTS, Preview
  status) — both isolated behind service interfaces, neither implemented yet.
- TDD is mandatory (RED/GREEN/REFACTOR) for all feature work.

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
