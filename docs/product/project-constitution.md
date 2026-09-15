# Project Constitution

Status: ACCEPTED
Owner: pascual.vila.segura@gmail.com
Last updated: 2026-09-15
Milestone: M0

## 1. Vision

A scalable web platform for learning languages through video, audio, animation, interactive
exercises, gamification, and dual dashboards (student / teacher). First language: **Polish**.
The platform must support adding further languages (English, Spanish, German, French, Italian,
Portuguese, ...) without duplicating the React application or backend logic — languages are
data (`languageId`), not code branches.

## 2. Governing principles (non-negotiable for all future milestones)

1. **Anti-hallucination.** No invented APIs, SDKs, endpoints, versions, pricing, limits or legal
   requirements. Unverifiable facts are marked `UNKNOWN`. Multiple valid solutions are presented
   as `OPTION A/B/C` with trade-offs, not silently decided. See
   [.claude/skills/anti-hallucination/SKILL.md](../../.claude/skills/anti-hallucination/SKILL.md).
2. **Clean/Hexagonal layering.** Presentation → Application → Domain → Data/Infrastructure.
   Domain never imports infrastructure, PostgreSQL, Gemini, or Hyperframes types.
   See [architecture-overview.md](../architecture/architecture-overview.md).
3. **Content/code separation.** Educational content lives in `content/`, addressed by
   `languageId`, never hardcoded into React components. See
   [content-architecture.md](../architecture/content-architecture.md).
4. **TDD is mandatory.** RED → GREEN → REFACTOR for every feature. See
   [tdd-workflow.md](../testing/tdd-workflow.md).
5. **No overengineering.** Modular monolith. No microservices, Kubernetes, CQRS, event
   sourcing, or distributed systems without a documented ADR justifying the exception
   (see section 49 of the M0 brief; none currently justified).
6. **No AWS.** All infrastructure and provider choices must avoid AWS. PostgreSQL is remote and
   managed by a non-AWS provider (see [ADR-005](../adr/adr-005-database.md)).
7. **Secrets never enter Git.** Environment variables validated at startup; `.env.example` is the
   only committed environment file.
8. **Every non-trivial architectural decision gets an ADR** (see [ADR index](../adr/README.md)).

## 3. Scope of this document

This constitution governs Milestone 0 (architecture and governance) and remains binding for all
subsequent milestones unless superseded by a new ADR. It does not itself implement any feature.

## 4. Related documents

- [Architecture overview](../architecture/architecture-overview.md)
- [Domain model / bounded contexts](../architecture/domain-model.md)
- [Content architecture](../architecture/content-architecture.md)
- [Folder structure](../architecture/folder-structure.md)
- [AI integration strategy](../architecture/ai-integration-strategy.md)
- [MVP definition](mvp.md)
- [Future roadmap](roadmap.md)
- [Risk register](../risk-register.md)
- [ADR index](../adr/README.md)
