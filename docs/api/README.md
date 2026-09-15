# API Documentation

Status: PLACEHOLDER — no endpoints exist yet.

Once `apps/api` has real routes (post-M0), this directory holds API documentation — the planned
approach is an OpenAPI/schema-derived spec generated from the Zod schemas in `packages/contracts`
(so documentation can't drift from the actual validated request/response shapes), rather than a
hand-maintained document. Exact generation tooling is deferred to implementation time (see
[dependency-management.md](../development/dependency-management.md) before adding any such
dependency).
