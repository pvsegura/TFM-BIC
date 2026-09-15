---
name: api-design
description: REST API design conventions for apps/api - resource naming, DTO/contract sharing via packages/contracts, versioning, error shape. Use when adding or reviewing an API endpoint.
---

# API Design

REST, per [ADR-004](../../../docs/adr/adr-004-backend-stack.md). No endpoints exist yet as of M0
(see [docs/api/README.md](../../../docs/api/README.md)).

## Conventions

- Resource-oriented routes (`/lessons/:id`, `/students/:id/progress`), not RPC-style verbs in the
  path, unless an action genuinely isn't resource-shaped (e.g., `/exercises/:id/attempt`).
- Request/response shapes defined once as Zod schemas in `packages/contracts`, imported by both
  `apps/api` (validation) and `apps/web` (typed API client) — never duplicated.
- Consistent error response shape across all endpoints (status code + machine-readable error code
  - message) — exact shape TBD at implementation time, but must be consistent once chosen.
- Auth/role checks happen in the route/controller layer before calling the use case, using the
  mechanism decided in [ADR-006](../../../docs/adr/adr-006-authentication.md).
- Pagination/filtering query params are standard on any list endpoint likely to grow (teacher's
  student list, lesson list, vocabulary list) — not added later as an afterthought.

## Documentation

Once endpoints exist, generate docs from the same Zod schemas rather than hand-maintaining a
separate spec (see [docs/api/README.md](../../../docs/api/README.md)) — avoids drift.
