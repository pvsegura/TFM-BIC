# Monorepo Folder Structure

Status: ACCEPTED (M0) | Related: [ADR-002](../adr/adr-002-monorepo.md)

```
apps/
  web/                  React + Vite frontend
  api/                  Node.js backend (API)

packages/
  domain/               Entities, value objects, domain services — no external deps
  application/          Use cases, service interfaces (VideoGenerationService, etc.)
  contracts/            Shared DTOs, Zod schemas, API types (consumed by web + api)
  data/                 Repository implementations, PostgreSQL access, provider adapters
  shared/               Cross-cutting pure utilities (no business rules)
  ui/                   Shared design-system/React components (presentation only)
  config/               Environment/config loading and validation
  testing/              Shared test utilities/fixtures/factories

content/
  languages/            Per-language content (see content-architecture.md)
  exercises/            Exercise-type definitions shared across languages
  video-scripts/        Hyperframes scene scripts

infrastructure/
  docker/                Container definitions
  nginx/                 Reverse-proxy/static-serving config
  jenkins/                Jenkinsfile / pipeline config
  sonarqube/              Quality-gate config
  deployment/             Deploy scripts/manifests (non-AWS target, TBD)

tests/
  e2e/                    Playwright end-to-end tests
  integration/            Cross-package integration tests

docs/
  architecture/           This document and related architecture docs
  adr/                    Architectural Decision Records
  api/                    API documentation (OpenAPI, once endpoints exist)
  testing/                Testing/TDD strategy
  deployment/             Environments, CI/CD design
  security/               Security baseline, privacy/GDPR
  product/                Constitution, MVP, roadmap
  risk-register.md
  development/            Git strategy, commit convention, dependency management, Husky
                           (DEVIATION from the M0 brief's docs/ list — see below)

.claude/
  project-context.md, architecture.md, conventions.md, current-state.md
  skills/                 19 Claude skills (see conventions.md)
  agents/                 Reserved for future custom subagents
  commands/               Reserved for future custom slash commands
```

## Documented deviation

The M0 brief's suggested `docs/` tree lists `architecture, adr, api, testing, deployment,
security, product`. Git-branching strategy, commit convention, dependency-upgrade policy, and
Husky hook design don't fit naturally under any of those (they're development-process docs, not
architecture/testing/security/deployment). Rather than force them into `docs/architecture/` (where
they'd dilute the architecture docs) I added **`docs/development/`**. This is a folder addition,
not a removal or restructure — every folder from the brief still exists as specified.

## What exists after M0

Every directory above exists, most containing only a `README.md` placeholder describing its
purpose and the milestone that will populate it with real code/config — per the M0 constraint
against generating implementation code or installing dependencies. `content/languages/pl/`
additionally has the level (a1–c2) subfolder skeleton per
[content-architecture.md](content-architecture.md), still empty of actual lesson content.

## What exists after M1

`apps/{web,api}` and `packages/{domain,application,contracts,data,shared,ui,config,testing}` are
now real, installable, tested TypeScript packages (each still described by its own README, now
updated to say what's actually in it) — see
[.claude/current-state.md](../../.claude/current-state.md) for the concrete list.
`infrastructure/` and `content/` remain placeholder-only; both are explicitly out of M1 scope.
