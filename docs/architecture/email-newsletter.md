# Email and newsletter (M14)

Reference for the email boundary and the newsletter. Decisions and trade-offs:
[ADR-025](../adr/adr-025-email-newsletter.md) (and [ADR-014](../adr/adr-014-email.md) for the provider).

## Layers

```
identity use cases ──► EmailService (M3 port) ──► TransactionalIdentityEmailService ─┐
newsletter step 1  ──────────────────────────────► TransactionalEmailSender ─────────┼─► renderEmail ─► EmailProvider
SendNewsletterIssue ─► toMarketingRecipient ─────► MarketingEmailSender ─────────────┘   (templates)    (FakeEmailProvider)
```

| Where                                 | What                                                                                      |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `packages/domain/src/email`           | `EmailCategory`, template ids per category, `categoryOfTemplate`                          |
| `packages/domain/src/newsletter`      | `NewsletterSubscription` states and rules, `MarketingRecipient`, consent version          |
| `packages/application/src/email`      | `EmailProvider` port, senders, templates + messages, `EmailDeliveryError`, codec port     |
| `packages/application/src/newsletter` | Repository port, preference/subscribe/confirm/unsubscribe use cases, issue sending        |
| `packages/data/src/email`             | `FakeEmailProvider`, `HmacUnsubscribeTokenCodec`                                          |
| `packages/data/src/newsletter`        | `newsletter_subscriptions` schema, migration set `db:migrate:newsletter`, repository      |
| `apps/api`                            | `email-dependencies.ts`, `email-use-cases.ts`, `routes/email-preferences.route.ts`        |
| `apps/web`                            | `EmailPreferencesSection` on `/profile`, `/newsletter/confirm`, `/newsletter/unsubscribe` |

## Categories

| Template                  | Category      | Needs consent    | Unsubscribe link             |
| ------------------------- | ------------- | ---------------- | ---------------------------- |
| `email-verification`      | transactional | no               | no                           |
| `password-reset`          | transactional | no               | no                           |
| `newsletter-confirmation` | transactional | no (asks for it) | no                           |
| `newsletter-issue`        | marketing     | confirmed        | yes + `List-Unsubscribe` URL |

## Newsletter states

```
(no row) ──request──► pending ──confirm (token, < 48 h)──► subscribed
             ▲           │                                   │
             │        cancel                            unsubscribe (session or link)
             │           ▼                                   ▼
             └──request── unsubscribed ◄─────────────────────┘
```

Settings shows `pending` as "waiting for your confirmation"; `unsubscribed` and no row both as "Not subscribed".

## Links

All built from `APP_BASE_URL`, never a request header:

- `/verify-email?token=…` (24 h, single use — M3)
- `/reset-password?token=…` (1 h, single use — M3)
- `/newsletter/confirm?token=…` (48 h, single use)
- `/newsletter/unsubscribe?token=<key>.<hmac>` (no expiry; page asks for one click)
- one-click: `/email-preferences/newsletter/unsubscribe?token=…` (the `listUnsubscribeUrl` of a marketing message)

Tokens are never logged: request logs drop the query string, delivery logs carry no recipient, subject or link, and
the fake provider keeps messages only in memory (bounded to 500).

## What the fake provider does

Everything is captured in memory and nothing leaves the process, in every environment (the only accepted
`EMAIL_PROVIDER`). Under `NODE_ENV=test` **and** only in the E2E composition, `GET /auth/_test/emails?to=&template=`
returns the latest captured email (template, category, subject, links, one-click URL) and
`POST /email-preferences/_test/newsletter-issues` sends an issue to every confirmed subscription. Neither route
exists in any other composition. In local development there is therefore no way to read a verification link other
than the database/tests — unchanged from M3.

## Privacy

- **Stored**: per subscribing user — status, consent-text version, source (`settings`), requested/confirmed/
  unsubscribed timestamps, a random unsubscribe key, a SHA-256 confirmation-token hash (only while pending),
  when the confirmation was last sent. No email copy, IP, user agent or provider payload.
- **Sent to a provider** (once a real one exists): recipient address, sender/reply-to, subject, HTML and text body
  (which contain the link tokens), and for marketing the one-click URL. Nothing is sent today.
- **Provider metadata stored**: none (no message ids, no webhooks yet).
- **Preferences**: changed only by the user (settings, the confirm link, or an unsubscribe link).
- **Account deletion**: the row is deleted with the user (`ON DELETE CASCADE`), so no marketing can continue; the
  deletion workflow itself does not exist yet.
- **Email change**: not implemented. When it is, it must set the newsletter back to not subscribed (or require a new
  confirmation) — consent was confirmed for the old address. Transactional email always goes to the current address.
- This is technical groundwork, **not** a claim of GDPR compliance; see [privacy-gdpr.md](../security/privacy-gdpr.md).

## Known limitations

- No real provider (ADR-014 PENDING) — no email is actually delivered anywhere.
- No webhooks, bounce/complaint handling or suppression list; no `List-Unsubscribe` _header_ is emitted by the fake
  (the URL is on the message for a real adapter to map to its own header fields).
- Synchronous best-effort delivery; no outbox/retry; newsletter issues are sent sequentially and have no operator
  tooling outside the E2E route (the use case is the integration point for a future CLI/admin).
- One locale (English).
- Rate limits are per IP, in memory, per process.
