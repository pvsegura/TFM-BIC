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
