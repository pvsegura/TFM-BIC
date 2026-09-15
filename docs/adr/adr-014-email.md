# ADR-014: Email

Status: PENDING (provider selection) — architecture decision ACCEPTED
Date: 2026-09-15

## Context

Need transactional email (verification, password reset, invitations) and separately-consented
marketing/newsletter email, without AWS (so not SES).

## Decision

**Architecture (ACCEPTED)**: `EmailService` interface (transactional) kept distinct from the
Newsletter bounded context's consent/subscription logic (see
[domain-model.md](../architecture/domain-model.md)) — different legal basis under GDPR (see
[privacy-gdpr.md](../security/privacy-gdpr.md)), so they must not share an unsubscribe/consent
record.

**Provider (PENDING)** — research done 2026-09-15:

- **OPTION A — Resend.** 3,000 free emails/month (100/day cap), developer-friendly API,
  first-class TypeScript support.
- **OPTION B — Brevo.** ~300/day (~9,000/month) free, the most generous ongoing free tier found.
- **OPTION C — Postmark.** 100/month free — not viable as a production free tier, only for
  development/testing.
- SendGrid noted as having removed its permanent free tier (as of a 2025 change found in
  research) — not a strong free-tier candidate.

No provider selected. Recommendation for the decision owner: Resend or Brevo depending on whether
API ergonomics (Resend) or volume (Brevo) matters more; **exact current limits should be
re-verified on the provider's pricing page before signing up**.

## Options considered

See above.

## Consequences

- Whichever provider is chosen, `EmailService` must not leak provider-specific template/API
  shapes into `packages/application`.
- Newsletter consent/unsubscribe records are tracked independently of transactional email
  delivery logs.

## References

- [domain-model.md](../architecture/domain-model.md)
- [privacy-gdpr.md](../security/privacy-gdpr.md)
