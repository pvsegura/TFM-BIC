# ADR-014: Email

Status: ACCEPTED (architecture and M3 dev/test strategy) / PENDING (real production provider
account provisioning — deployment-time, out of M3 scope)
Date: 2026-09-15
Updated: 2026-09-17 (M3 — documented target provider and dev/test adapter)

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

## M3 update (2026-09-17)

**Documented target provider: Resend** (API ergonomics/TypeScript support weighted over Brevo's
higher volume, since M3's transactional volume — verification + reset emails — is low). This
agent session cannot create a third-party Resend account, and per the M3 brief real provider
accounts are not to be silently chosen/signed-up-for and no real email may be sent from automated
tests — so **no Resend adapter is wired to real credentials in M3**.

What M3 actually implements: the `EmailService` port (owned by `packages/application`) plus one
concrete adapter, `InMemoryEmailService` (`packages/data`), which records sent messages
(recipient, template kind, and the verification/reset link — never logged, only held in memory)
so both automated tests and local manual testing can retrieve the link a real email would have
contained, without sending anything over the network. This is the adapter wired in `development`
and `test`. A real `ResendEmailService` adapter is a documented follow-up: same `EmailService`
interface, swapped in once `EMAIL_PROVIDER_API_KEY` is actually issued — no application/domain
code changes required when that happens, which is the point of the port/adapter split.

## Options considered

See above.

## Consequences

- Whichever provider is chosen, `EmailService` must not leak provider-specific template/API
  shapes into `packages/application` — confirmed by construction: `InMemoryEmailService` and any
  future `ResendEmailService` both implement the same `EmailService` interface.
- Newsletter consent/unsubscribe records are tracked independently of transactional email
  delivery logs.
- No transactional email is actually deliverable until a real provider account/API key exists —
  tracked as a known limitation in `.claude/current-state.md`, not silently glossed over.

## References

- [domain-model.md](../architecture/domain-model.md)
- [privacy-gdpr.md](../security/privacy-gdpr.md)
