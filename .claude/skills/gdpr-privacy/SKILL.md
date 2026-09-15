---
name: gdpr-privacy
description: Privacy/data-protection considerations - NOT legal advice. Use when working on account deletion, data export, consent, newsletter, or any legal/privacy-facing page or flow.
---

# GDPR / Privacy

Full doc (with disclaimer): [docs/security/privacy-gdpr.md](../../../docs/security/privacy-gdpr.md).
This skill is architectural guidance, not legal advice — never present generated legal text as
compliant without a flagged `PENDING legal review`.

## What the architecture must preserve

- Access/rectification/erasure/export/consent/withdrawal capabilities are hooks in the domain
  (Privacy & Data Management is its own bounded context — see
  [domain-model.md](../../../docs/architecture/domain-model.md)), not ad hoc DB operations.
- Newsletter consent is a separate record from "has an account" / transactional-email necessity —
  don't merge these when implementing.
- Account deletion is a use case with a defined retention/anonymization policy, not a raw
  `DELETE` — even though the exact retention policy content is PENDING legal input.

## When writing legal-facing pages (Terms, Privacy, Data Management, Contact)

Do not invent legal requirements or present boilerplate as verified-compliant text. Mark
uncertain/unverified legal claims `UNKNOWN` or `PENDING legal review`, per
[anti-hallucination](../anti-hallucination/SKILL.md).

## Cookies/consent banner

Only needed if non-essential cookies/tracking are added — not yet decided; don't add either
without checking whether this triggers a consent-banner requirement.
