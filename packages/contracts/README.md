# packages/contracts

Shared DTOs, Zod schemas, and API types consumed by both `apps/web` and `apps/api`. Pure types/
schemas — no runtime logic beyond validation, no dependency on domain/data internals.

## What's here (M1)

`healthResponseSchema`/`HealthResponse` (`src/health/`) — the one contract `apps/api` actually
serves in M1, demonstrating the shared-contract pattern without inventing business DTOs ahead of
the endpoints that would need them.
