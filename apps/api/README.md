# apps/api

Node.js 24 + TypeScript (strict) + Fastify 5 backend (REST). Framework decision finalized for M1
in [ADR-004](../../docs/adr/adr-004-backend-stack.md) (was PROPOSED in M0, now ACCEPTED with a
verified current version). Conventions: [.claude/skills/node-typescript](../../.claude/skills/node-typescript/SKILL.md).

## What's here (M1)

- `GET /health` and `GET /ready` only — no business endpoints (`/auth`, `/users`, etc. do not
  exist yet, per the M1 brief).
- Thin route layer (`src/routes/`) that calls into `@tfm-bic/application`'s
  `GetHealthStatusUseCase`, which depends on `@tfm-bic/domain`'s `LanguageId` value object and a
  `Clock` port implemented by `@tfm-bic/data`'s `SystemClock` — a full, working example of the
  route → use case → domain → repository/adapter layering described in
  `docs/architecture/architecture-overview.md`, without implementing a real feature.
- Environment validated at startup via `@tfm-bic/config`'s `loadEnv()` — fails fast on malformed
  config.
- Structured logging (Fastify's built-in Pino logger) with auth/cookie header redaction, a
  centralized error handler, and SIGINT/SIGTERM graceful shutdown.

## Running

Workspace packages this app depends on resolve to their TypeScript **source** (each
`package.json`'s `main` points at `src/index.ts`), so `dev`/`start` run through `tsx`, which
transpiles on the fly — see the root README's "Why apps/api's dist/ isn't a standalone runtime
artifact yet" note. `pnpm build` still runs a real `tsc` compile as a correctness/type-declaration
check.

Commands (from repo root): `pnpm dev:api`, `pnpm --filter @tfm-bic/api test`, `pnpm --filter @tfm-bic/api build`.
