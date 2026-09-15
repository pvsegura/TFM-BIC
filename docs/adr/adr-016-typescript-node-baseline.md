# ADR-016: TypeScript & Node.js Runtime Baseline

Status: ACCEPTED
Date: 2026-09-15

## Context

M1 scaffolds a real, installable TypeScript monorepo and must pin a Node.js runtime and a
TypeScript compiler version shared by every package/app. Both moved significantly in 2026:
Node.js changed its LTS cadence, and TypeScript shipped a ground-up rewrite.

## Decision

**Node.js 24 (Active LTS)**, declared via `.nvmrc` and `package.json`'s `engines.node`. Verified
2026-09-15: Node 24 is Active LTS (until ~Oct 2027); Node 22 is already Maintenance LTS. Node 24
is also the last major line to bundle Corepack (removed starting with Node 25), which this repo's
pnpm workspace setup relies on (see ADR-002) — another reason to prefer 24 over jumping to 26 the
moment it reaches LTS in October 2026.

**TypeScript `~6.0.3`, not TypeScript 7.** TypeScript 7.0 (the Go/"tsgo"-based rewrite, announced 2026) was evaluated and explicitly rejected for now. Verified 2026-09-15:
`typescript-eslint`'s supported range is `>=4.8.4 <6.1.0` — TypeScript 7 is entirely outside it,
because TS 7.0 ships without the programmatic compiler API that typed ESLint rules (and other
tooling) depend on. Installing TypeScript 7 alongside `typescript-eslint` fails at the npm
peer-dependency check; forcing past it breaks linting at runtime. TypeScript 6.0 (March 2026) is
the last release on the original JS-based compiler and is what `typescript-eslint`, Vite, Vitest,
and every other tool in this stack are actually tested against.

## Options considered

- **OPTION A — TypeScript 6.0.x (chosen).** Pros: full ecosystem compatibility today
  (`typescript-eslint`, Vite/Vitest's type-aware tooling). Cons: not the fastest compiler
  available.
- **OPTION B — TypeScript 7.x.** Pros: ~10x faster compiles (Go-based). Cons: no programmatic
  compiler API yet (`typescript-eslint` cannot run against it — confirmed, not assumed), so
  `pnpm lint` would break; TS 7.1's promised new API wasn't available as of this ADR's date.
  Revisit this ADR once `typescript-eslint` (or ESLint's own typed-linting story) officially
  supports TypeScript 7.

## Consequences

- Revisit this decision once `typescript-eslint` publishes TypeScript 7 support — check
  `typescript-eslint`'s `users/dependency-versions` page before upgrading, not just TypeScript's
  own release notes.
- All `tsconfig.json` files in the repo extend `tsconfig.base.json`, which targets `ES2023` and
  uses `"moduleResolution": "Bundler"` — chosen because every consumer of workspace packages in
  M1 (Vite, Vitest, tsx) is a bundler/esbuild-based tool, not plain `tsc`-then-`node`; see the
  source-resolution note in ADR-002.

## References

- [ADR-002](adr-002-monorepo.md) — pnpm/Corepack and source-resolution rationale
- [ADR-004](adr-004-backend-stack.md) — Fastify/Node version pairing
- [dependency-management.md](../development/dependency-management.md)
