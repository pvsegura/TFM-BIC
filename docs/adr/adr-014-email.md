# ADR-014: Email

Status: ACCEPTED — provider: Resend (adapter added 2026-10-07)
Date: 2026-09-15
Updated: 2026-09-17 (M3 — documented target provider and dev/test adapter); 2026-09-26 (M14 — see below); 2026-10-07 (Resend adapter — see below)

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

## M14 update (2026-09-26)

The architecture above is now implemented in full — see [ADR-025](adr-025-email-newsletter.md) and
[email-newsletter.md](../architecture/email-newsletter.md):

- `InMemoryEmailService` was replaced by an `EmailProvider` port (application) with one adapter,
  `FakeEmailProvider` (packages/data), selected by `EMAIL_PROVIDER=fake` — the only accepted value. The
  transactional and marketing senders sit above the port; M3's `EmailService` is implemented on the
  transactional one.
- **Provider: still PENDING.** The user decided in M14 not to add a Resend (or any real) adapter yet. Resend stays
  the documented target; its current documentation was deliberately not re-verified, because no adapter was
  written. Before adding one: re-verify its API, auth, sender-domain requirements, limits, `List-Unsubscribe`
  header support and webhooks against the official docs, add the value to `EMAIL_PROVIDER`, and read its API key
  from the host's secret store.
- `EMAIL_PROVIDER_API_KEY` was removed from `.env.example` (nothing reads it); `EMAIL_FROM` is now read.

## Resend adapter (2026-10-07)

The product moved to its own domain (verbysia.com), verified in Resend by the owner, so the provider decision
is made: **Resend**. `ResendEmailProvider` (packages/data) is selected with `EMAIL_PROVIDER=resend` and needs
`RESEND_API_KEY` and a real `EMAIL_FROM`; `loadEnv` refuses it under `NODE_ENV=test`, so CI/E2E keep using the fake.

Verified against Resend's official API reference on 2026-10-07 (no SDK; plain `fetch`):

- `POST https://api.resend.com/emails`, `Authorization: Bearer <key>`, and a mandatory `User-Agent` (requests
  without one get 403). Body: `from`, `to[]`, `subject`, `html`, `text`, `reply_to`, `headers`, `tags`.
- `Idempotency-Key` (≤ 256 chars, 24 h): one UUID per message, reused across retries.
- Retried (max 2, 0.5 s / 1.5 s): 429 `rate_limit_exceeded`, 5xx, network errors, the 10 s timeout. Never retried:
  401/403/422 and the daily/monthly quota 429s. Default rate limit: 10 requests/s per team.
- Marketing messages carry `List-Unsubscribe: <url>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
- The error body shape is not documented: only an error-code-looking `name` is read, and failures are logged as
  `email.delivery_failed` with a safe `reason` such as `http_403:validation_error` — never the message, recipient or key.

Still not built: Resend webhooks (bounces/complaints) and a suppression list (ADR-025 consequences).

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
