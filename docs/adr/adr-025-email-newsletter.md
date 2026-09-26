# ADR-025: Email and newsletter — separate transactional and marketing paths, double opt-in, best-effort delivery

Status: ACCEPTED (architecture, consent model, delivery strategy) / PENDING (real provider — ADR-014; legal
sufficiency of the consent model — privacy-gdpr.md)
Date: 2026-09-26 (M14 — Email + Newsletter)

Builds on [ADR-014](adr-014-email.md) (provider behind a port; provider still PENDING) and
[ADR-006](adr-006-authentication.md) (hashed, single-use, expiring tokens; enumeration resistance). Reference:
[email-newsletter.md](../architecture/email-newsletter.md) and the [API docs](../api/README.md).

## Context

Before M14: M3's identity use cases called an `EmailService` port whose only adapter, `InMemoryEmailService`, was
wired in **every** environment (production included); emails had no templates; no preferences, consent,
newsletter or unsubscribe existed. Two defects were found while inspecting:

- A provider failure during registration surfaced as a 500 **after** the user and token were stored.
- For forgot-password and resend-verification, a provider failure made the response differ between existing and
  unknown addresses (500 vs 200) — an account-enumeration channel.

M14 had to add marketing email without letting it borrow transactional email's legal basis, and without choosing a
provider (the user decided: fake provider only; ADR-014 stays PENDING).

## Decision

### 1. Two senders, one provider port

- `EmailProvider.send(OutgoingEmail)` (application port) is the only infrastructure boundary. `OutgoingEmail` is
  fully rendered and provider-independent: to/from/reply-to, subject, HTML, text, `category`, `template`, and an
  optional one-click unsubscribe URL. No SDK type exists anywhere.
- `TransactionalEmailSender.send(to, request)` accepts only transactional templates (the request type excludes
  marketing ones). It needs no consent and adds no unsubscribe link.
- `MarketingEmailSender.send(recipient, content)` accepts only a `MarketingRecipient` — a branded type whose only
  constructor, `toMarketingRecipient`, throws unless the subscription is `subscribed`. It always adds the recipient's
  unsubscribe link and the RFC 8058 one-click URL. Sending marketing email without consent does not type-check.
- The category is derived from the template (`categoryOfTemplate`), never passed by callers.
- M3's `EmailService` port is kept and implemented by `TransactionalIdentityEmailService` over the transactional
  sender, so the identity use cases are unchanged apart from failure handling (§4).

### 2. Named templates, escaped variables, links pinned to the app origin

Templates are code in `packages/application/src/email/templates`, wording in one per-locale message table (English
only — the whole UI is English; the locale is a parameter, not hardcoded). Every interpolated value is HTML-escaped;
templates accept no HTML. Every link must be absolute http(s) on the **configured** `APP_BASE_URL` origin (no
user-info, no other host/port/scheme, no quote/space/control characters) — never derived from a request's `Host`.
Newsletter content is plain text: subject (one line, ≤ 150), title, 1–20 paragraphs (≤ 2000 each).

### 3. Newsletter consent: its own record, double opt-in

`newsletter_subscriptions` (one row per user, created only when the user asks — never at registration):
`pending → subscribed → unsubscribed` (and `pending → unsubscribed` to cancel; a later request starts over).
Recorded: status, consent-text version (`NEWSLETTER_CONSENT_VERSION`), source (`settings`), requested/confirmed/
unsubscribed timestamps. Not recorded: email address (read from `users` at send time), IP, user agent, provider
payloads. DB CHECKs mirror the domain states; `ON DELETE CASCADE` to `users`.

Double opt-in was chosen by the user: step 1 (authenticated, explicit `consent: true` + the consent-text version)
stores `pending` and sends a transactional confirmation email with a 256-bit token, stored as SHA-256 only,
48 h expiry, single use (cleared on confirmation, invalidated by a newer request or a cancellation). Step 2
(public, token only) sets `subscribed`. Whether single or double opt-in is legally required for the target
jurisdictions is **not** asserted here — it is PENDING legal review; double opt-in was chosen as the safer default.
No anonymous signup exists (no product decision for it).

### 4. Delivery: synchronous, best effort, no outbox

Emails are sent inline in the request. No outbox, queue or retry worker was added, because no flow needs the
database write and the email to be atomic — each has a user-driven recovery:

| Flow                 | Provider fails →                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------ |
| Register             | Account + token kept; same generic 200. User uses "resend verification".                   |
| Resend verification  | New token kept; same generic 200 (enumeration-safe).                                       |
| Forgot password      | New token kept; same generic 200 (enumeration-safe).                                       |
| Newsletter subscribe | Stays `pending`, marked "not sent" so an immediate retry resends; `503` (user's own data). |
| Newsletter issue     | That recipient is counted as failed; the others continue.                                  |

Only `EmailDeliveryError` is absorbed; any other error still fails the request. Each attempt is logged as
`email.delivery_accepted|failed` with category, template, adapter and outcome only.

Idempotency: resend/reset invalidate earlier tokens before issuing a new one (M3); a repeated subscribe within
60 s does not send a second email; an already-subscribed request sends nothing; unsubscribes are no-ops when
already done. Route rate limits cap the rest (§6).

### 5. Unsubscribe: signed, non-expiring, idempotent, no login

The link carries `<unsubscribeKey>.<HMAC-SHA256(EMAIL_LINK_SECRET, purpose+key)>`. The key is random per
subscription (stable for its lifetime, so old emails keep working) — never the user id. A database leak alone does
not yield working links. Tokens do not expire by design: all they can do is withdraw consent. Both the page
(`/newsletter/unsubscribe`, one click) and RFC 8058 one-click POSTs (token in the URL, form body, no `Origin`) use
`POST /email-preferences/newsletter/unsubscribe`. Request logs no longer include query strings.

There is no "unsubscribe from all email": essential (transactional) email is shown as always on and cannot be
turned off; the only switch is the newsletter.

### 6. Rate limits

Subscribe 5/h, confirm 20/15 min, settings-unsubscribe 20/15 min, link-unsubscribe 30/15 min, preferences GET
60/min (per IP, `@fastify/rate-limit`, raised only by `E2E_RELAXED_RATE_LIMITS`). M3's limits on register (5/h),
resend (5/h) and reset request (5/h) are unchanged.

### 7. Provider configuration

`EMAIL_PROVIDER` accepts only `fake` (the default) — local development, CI and E2E cannot email anyone, and a real
adapter must be added deliberately. `EMAIL_FROM`/`EMAIL_REPLY_TO` refuse line breaks. `EMAIL_LINK_SECRET` (≥ 32
chars) is required in production/staging. The API logs a warning at start-up outside tests while the fake provider
is active.

## Options considered

- **One `EmailService` with a `category` argument** — rejected: a caller could pass `transactional` for a
  newsletter; the type split makes that impossible.
- **Outbox table + worker** — rejected for M14 (see §4); revisit if a flow needs atomicity or if the real provider's
  failure rate makes user-driven retry insufficient.
- **Hashed random unsubscribe token per subscription** — rejected: the raw token must be re-embedded in every
  issue, which a hash cannot provide; storing it plainly would let a DB leak unsubscribe everyone.
- **Auto-confirm/unsubscribe on page load** — rejected: mail security scanners prefetch links.

## Consequences

- No real email is delivered in any environment until ADR-014's provider is chosen and an adapter is added (same
  port, no application changes).
- Provider webhooks (bounces, complaints, provider-side unsubscribes) are not handled; there is no suppression list.
  The real adapter's milestone must add verified webhooks and stop marketing to hard-bounced/complained addresses.
- Sending is sequential in one request; a large list needs batching or a worker later.
- Rotating `EMAIL_LINK_SECRET` breaks unsubscribe links in already-sent issues.
- Account deletion removes the consent record by cascade; there is no deletion workflow yet (M4/privacy context).
- Email change does not exist; when added, it must reset the newsletter to not-subscribed (consent was confirmed
  for the old address) — see email-newsletter.md.
