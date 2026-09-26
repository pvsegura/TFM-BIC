# Privacy & Data Protection Considerations

Status: PROPOSED — NOT LEGAL ADVICE
Related: [domain-model.md](../architecture/domain-model.md) (Privacy & Data Management context)

## Disclaimer

This document is an architectural preparation for privacy/data-protection requirements, written
by a software-architecture assistant, **not a lawyer**. It must not be treated as definitive legal
compliance advice. Before launch, actual legal requirements (GDPR applicability, and any other
jurisdiction the product targets) must be verified against official sources and, if warranted, a
qualified professional — this is flagged as **PENDING legal review**, not asserted as compliant.

## What the architecture must support (regardless of final legal scope)

Because the product may process EU users' personal data, the architecture is prepared for
GDPR-shaped requirements without asserting they've been fully implemented or legally verified:

- **Access** — a user can request/see what personal data is held about them.
- **Rectification** — profile fields (name, nickname, etc.) are editable by the user. _Technical
  control implemented in M4_: a student can edit or clear their first name, last name and nickname
  and replace their avatar ([ADR-017](../adr/adr-017-student-profile.md)). This is a capability,
  not a claim of GDPR compliance.
- **Erasure** — account deletion is supported (Student Features §14 of the brief: "solicitar
  eliminación de cuenta"), including a defined retention/anonymization policy for data that can't
  be immediately hard-deleted (e.g., financial records if subscriptions exist) — policy content
  itself is PENDING legal input.
- **Export** — data portability is a planned capability; format/scope PENDING.
- **Consent** — Newsletter subscription consent is recorded separately from transactional-email
  necessity (see [domain-model.md](../architecture/domain-model.md): Email vs Newsletter split) —
  transactional email does not require marketing consent, but this split itself should be
  confirmed against the applicable legal basis at implementation time.
- **Withdrawal** — unsubscribe/consent-withdrawal must be at least as easy as subscribing.
- **Retention** — data retention periods are PENDING — not defined in M0.
- **Cookies/consent banner** — needed if any non-essential cookie/tracking is used; PENDING
  product decision on analytics/tracking tools, which would trigger this requirement.

## Teacher access to student data (M13)

A teacher sees only students linked to them (operator-created links), and only learning data: names, nickname,
avatar, lesson/exercise/points metrics, recent lesson titles and exercise verdicts, unlocked achievements. Never an
email, account/security data, submitted answers, vocabulary/phonetics progress or media jobs. Each student view is
logged (`teacher.student_viewed`). Full list:
[teacher-dashboard.md](../architecture/teacher-dashboard.md#privacy--what-a-teacher-can-and-cannot-see).
OPEN: whether students must be told which teacher can see their data (a notice or consent step) is a product/legal
decision for the invitation flow that will replace operator linking.

## Email and newsletter (M14)

Technical controls only — **not** a claim of compliance; the legal basis for each category and whether double
opt-in and the recorded metadata are sufficient remain **PENDING legal review**.

- **Two categories.** Transactional email (verification, password reset, the newsletter confirmation itself) is
  sent without marketing consent and cannot be switched off; marketing (the newsletter) goes only to a confirmed
  subscription and always carries an unsubscribe link. There is no "unsubscribe from all email".
- **Consent is separate from the account.** Registration never subscribes anyone. Subscribing needs an explicit,
  unticked checkbox whose text explains what is agreed to, then a click on an emailed confirmation link (double
  opt-in). Stored per subscribing user: status, consent-text version, source, requested/confirmed/unsubscribed
  timestamps, a random unsubscribe key, and a hashed confirmation token while pending. No email copy, IP address,
  user agent or provider payload.
- **Withdrawal is at least as easy as subscribing**: one click in settings, or one click from the link in any
  newsletter without logging in, or a mail client's one-click unsubscribe.
- **Sent to a provider** (none is connected yet): address, sender, subject and body (with link tokens).
- **Account deletion** removes the consent record (`ON DELETE CASCADE`), so marketing cannot continue after an
  account is deleted; the deletion workflow itself is still to be built.
- **Email change** is not implemented; when it is, newsletter consent must not silently move to the new address.

Details: [email-newsletter.md](../architecture/email-newsletter.md#privacy), [ADR-025](../adr/adr-025-email-newsletter.md).

## Architectural hooks (exist now, so the above isn't bolted on later)

- Privacy & Data Management is its own bounded context (not folded into Users), so
  access/rectification/erasure/export requests are auditable independently.
- Account deletion is a domain-level use case, not an ad-hoc DB delete — allows enforcing
  retention/anonymization rules consistently.
- Newsletter consent state is a first-class record, separate from "has an account."
- The M4 `student_profiles` row has a cascading foreign key to `users`, so deleting a user cannot
  leave orphaned profile data. The account-deletion _workflow_ itself (use case, retention rules,
  confirmation) is not implemented yet.

## Explicitly deferred to a dedicated milestone

Legal pages (Terms and Conditions, Privacy Policy, Data Management, Contact) are UI/content work,
listed in the brief's MVP scope — not written in M0, and when written, their legal content must
come from verified sources/legal review, not generated as boilerplate presented as compliant.
