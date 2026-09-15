# ADR-005: Database

Status: PENDING (provider selection) — architecture decision ACCEPTED
Date: 2026-09-15

## Context

Product brief mandates: remote PostgreSQL, no AWS, evaluate managed providers with a free tier
suitable for MVP, without assuming the free tier persists indefinitely.

## Decision

**Architecture (ACCEPTED)**: PostgreSQL, accessed only through `packages/data` repository
implementations behind domain-owned repository interfaces (ADR-001). No ORM chosen yet — deferred
to scaffold time.

**Provider (PENDING)** — research done 2026-09-15:

- **OPTION A — Neon.** Free tier: 1 project, 10 branches, 3 GiB/branch, 0.5 GB storage,
  100 compute-hours/month, shared compute (1 GB RAM), described as hostable "indefinitely at $0,
  no card required." Serverless/branching model fits preview-environment workflows well.
- **OPTION B — Supabase.** Free tier: 750 MB storage, native Postgres, also indefinite/no card.
  Bundles auth/storage/realtime/edge-functions — potentially redundant with this project's own
  Identity & Authentication context (ADR-006), which is a reason to be cautious about adopting
  Supabase's bundled auth rather than just its Postgres.
- **OPTION C — Railway.** No permanent free Postgres tier (one-time trial credit only, then
  usage-based paid) — weaker fit for a free MVP baseline.

No provider selected in M0. Recommendation for the decision owner: Neon or Supabase (using only
the Postgres feature, not the bundled auth) over Railway, given the free-tier durability
difference found above.

Source: aggregated provider-comparison search results dated 2026-09-15 (see AI integration
strategy doc's research note for methodology); **exact current limits should be re-verified on
each provider's pricing page immediately before signing up**, since free-tier terms change.

## Options considered

See above.

## Consequences

- Repository interfaces in `packages/domain`/`packages/application` must not leak
  provider-specific SQL dialects or connection details.
- Whichever provider is chosen, its free-tier limits become a tracked risk (see
  [risk-register.md](../risk-register.md)).
- If Supabase is chosen, an explicit decision is needed on whether to use its Auth product or
  keep this project's own Identity & Authentication context (ADR-006) — using both would
  duplicate responsibility.

## References

- [risk-register.md](../risk-register.md)
- [database skill](../../.claude/skills/database/SKILL.md)
