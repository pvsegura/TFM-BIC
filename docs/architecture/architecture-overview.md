# Architecture Overview

Status: ACCEPTED (M0) | Related: [ADR-001](../adr/adr-001-architecture-style.md), [ADR-002](../adr/adr-002-monorepo.md)

## Style

**Modular monolith** with Clean/Hexagonal layering, TypeScript monorepo, frontend and backend
deployed as separate apps but sharing domain/contract packages. No microservices, no message
bus, no distributed transactions in M0/MVP — see section 49 of the constitution for the
overengineering guardrail. Services may be extracted later from an existing module boundary if a
documented ADR shows a real scaling/ownership need.

## Layers

| Layer | Lives in | Responsibility | May depend on |
|---|---|---|---|
| Presentation | `apps/web` | React components, pages, layouts | Application (via hooks/services), Contracts |
| Application (client) | `apps/web/src/services`, hooks | Orchestrate UI use cases, call API client | API client, Contracts |
| API / Presentation (server) | `apps/api` | HTTP routes, controllers, DTO validation | Application, Contracts |
| Application (server) | `packages/application` | Use cases, orchestration, transactions | Domain, repository interfaces, service interfaces |
| Domain | `packages/domain` | Entities, value objects, domain services, business rules | Nothing external (no infra, no DB driver, no SDKs) |
| Data / Infrastructure | `packages/data` | Repository implementations, PostgreSQL access, external provider adapters | Domain (to implement interfaces), external SDKs |
| Contracts | `packages/contracts` | Shared DTOs, Zod schemas, API types | Nothing (pure types/schemas) |
| Content | `content/` | Language data, lessons, vocabulary, phonetics (JSON, schema-validated) | Nothing (data, not code) |

## Dependency flow (request path)

```
React UI
  -> Hooks / presentation services
  -> API client (packages/contracts types)
  -> Node API (apps/api routes/controllers)
  -> Application / Use Cases (packages/application)
  -> Domain (packages/domain)
  -> Repository interfaces (packages/domain or packages/application)
  -> Data / Infrastructure (packages/data)
  -> PostgreSQL
```

## Dependency flow (external AI/media services)

```
Application (Use Case, e.g. GenerateLessonAudioUseCase)
  -> Service interface (e.g. AudioGenerationService, in packages/application or packages/contracts)
  -> Infrastructure adapter (e.g. GeminiAudioProvider, in packages/data)
  -> External provider (Gemini API)
```

```
Application (Use Case, e.g. GenerateLessonVideoUseCase)
  -> Service interface (VideoGenerationService)
  -> Infrastructure adapter (HyperframesProvider)
  -> External provider (Hyperframes renderer)
```

The domain and application layers depend only on interfaces they own. Concrete SDKs
(`pg`, a Gemini client, the Hyperframes CLI/renderer) are only ever imported inside
`packages/data` adapters. This makes providers swappable and keeps the domain testable without
network access — required by the 80/20 testing strategy
(see [testing-strategy.md](../testing/testing-strategy.md)).

## Hard rules

- Domain must not import from `packages/data`, `pg`, any Gemini/Hyperframes SDK, or React.
- React components must not contain business rules (scoring, progress calculation, validation
  logic beyond form-level checks) — that belongs in `packages/domain`/`packages/application`,
  invoked via hooks/services.
- `content/` is data. No `if (languageId === 'pl')` branching in application code — behavior is
  parameterized by `languageId`, `levelId`, etc.; content differences are data differences.

## Non-functional requirements (see also [risk-register.md](../risk-register.md))

- **Scalability**: teacher dashboards with many students must use pagination, filtering, and
  avoid N+1 queries from day one (see [domain-model.md](domain-model.md), Teachers/Students).
- **Security**: see [security-baseline.md](../security/security-baseline.md).
- **Privacy**: see [privacy-gdpr.md](../security/privacy-gdpr.md).
- **Testability**: every layer must be unit-testable in isolation; domain and application require
  no network/DB to test.
- **Cost**: prefer free/low-cost tiers for MVP (see ADR-005, ADR-014, ADR-015); no provider
  assumed to keep a free tier indefinitely — verify before relying on it.
