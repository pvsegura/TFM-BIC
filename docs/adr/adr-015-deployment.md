# ADR-015: Deployment / Hosting

Status: PENDING
Date: 2026-09-15

## Context

Need hosting for `apps/web`, `apps/api`, Jenkins, and (if self-hosted) SonarQube — explicitly
excluding AWS. No provider has been named anywhere in the brief.

## Decision

**PENDING.** No hosting provider is selected in M0. This is deliberately left open rather than
guessed, per the anti-hallucination policy — hosting cost/capability claims would otherwise be
invented. A decision owner should evaluate non-AWS options (e.g., other cloud VPS/PaaS providers)
against: cost at MVP scale, Docker support (see `infrastructure/docker/`), whether it can run
self-hosted Hyperframes rendering (CPU/headless-browser capable), and whether it can host Jenkins
runners.

## Options considered

Not enumerated — doing so now would mean listing hosting providers without verified current
pricing/capability data, which the anti-hallucination policy forbids. This ADR exists as a
placeholder decision record so the open question is tracked, not to pre-select options.

## Consequences

- `infrastructure/deployment/` remains a placeholder until this ADR is resolved.
- CI/CD design (ADR-010) can proceed conceptually (pipeline stages) without this decision, but the
  final "deploy" stage's target is blocked on it.

## References

- [ci-cd-pipeline.md](../deployment/ci-cd-pipeline.md)
- [risk-register.md](../risk-register.md)
