# Architectural Decision Records

Format: one ADR per significant decision. Status is one of `PROPOSED`, `ACCEPTED`, `PENDING`
(decision explicitly deferred, not yet made), `SUPERSEDED`.

Template:

```markdown
# ADR-NNN: Title

Status: PROPOSED | ACCEPTED | PENDING | SUPERSEDED
Date: YYYY-MM-DD

## Context

## Decision

## Options considered

## Consequences

## References
```

## Index

| ADR                                        | Title                                 | Status                                                                                       |
| ------------------------------------------ | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| [001](adr-001-architecture-style.md)       | Architecture style                    | ACCEPTED                                                                                     |
| [002](adr-002-monorepo.md)                 | Monorepo                              | ACCEPTED                                                                                     |
| [003](adr-003-frontend-stack.md)           | Frontend stack                        | ACCEPTED                                                                                     |
| [004](adr-004-backend-stack.md)            | Backend stack                         | ACCEPTED                                                                                     |
| [005](adr-005-database.md)                 | Database                              | ACCEPTED (provider: Neon; account provisioning is a deployment-time action, out of M3 scope) |
| [006](adr-006-authentication.md)           | Authentication                        | ACCEPTED (strategy, session mechanism, password hashing)                                     |
| [007](adr-007-content-architecture.md)     | Content architecture                  | ACCEPTED                                                                                     |
| [008](adr-008-testing-strategy.md)         | Testing strategy                      | ACCEPTED                                                                                     |
| [009](adr-009-git-strategy.md)             | Git strategy                          | ACCEPTED                                                                                     |
| [010](adr-010-ci-cd.md)                    | CI/CD                                 | ACCEPTED (pipeline implemented) / PENDING (hosting)                                          |
| [011](adr-011-ai-architecture.md)          | AI integration architecture           | ACCEPTED                                                                                     |
| [012](adr-012-video-generation.md)         | Video generation (Hyperframes)        | PROPOSED                                                                                     |
| [013](adr-013-audio-generation.md)         | Audio generation (Gemini)             | PROPOSED                                                                                     |
| [014](adr-014-email.md)                    | Email                                 | ACCEPTED (architecture; target provider Resend documented) / PENDING (real provider account) |
| [015](adr-015-deployment.md)               | Deployment/hosting                    | PENDING                                                                                      |
| [016](adr-016-typescript-node-baseline.md) | TypeScript & Node.js runtime baseline | ACCEPTED                                                                                     |
