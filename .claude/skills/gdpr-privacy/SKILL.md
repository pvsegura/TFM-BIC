---
name: gdpr-privacy
description: Privacy/data-protection considerations - NOT legal advice. Use when working on account deletion, data export, consent, newsletter, or any legal/privacy-facing page or flow.
---

# GDPR / Privacy

Full docs (with disclaimer): [docs/privacy/](../../../docs/privacy/README.md) (M15 inventory, register, deletion
matrix, export format, flows, third parties, teacher access, risk check, sources) and the overview
[docs/security/privacy-gdpr.md](../../../docs/security/privacy-gdpr.md). Decision: ADR-026.
This skill is architectural guidance, not legal advice — never present generated legal text as
compliant without a flagged `PENDING legal review`.

## What the architecture must preserve

- Access/rectification/erasure/export/consent/withdrawal capabilities are hooks in the domain
  (Privacy & Data Management is its own bounded context — see
  [domain-model.md](../../../docs/architecture/domain-model.md)), not ad hoc DB operations.
- Newsletter consent is a separate record from "has an account" / transactional-email necessity —
  don't merge these when implementing.
- Account deletion is `DeleteAccountUseCase` → `DrizzleAccountErasureStore`, driven by `USER_DATA_REGISTER`
  (every table + disposition, guarded by a schema test) — never a raw `DELETE` elsewhere. Today everything is
  deleted; retention/anonymisation needs a documented reason (PENDING legal input) and an implementation.
- Export is `ExportPersonalDataUseCase` over `PersonalDataReadModel`: explicit columns, no secrets, versioned.
- Legal bases, retention, controller/contact, DPAs, transfers are PENDING — never fill them in.

## When writing legal-facing pages (Terms, Privacy, Data Management, Contact)

Do not invent legal requirements or present boilerplate as verified-compliant text. Mark
uncertain/unverified legal claims `UNKNOWN` or `PENDING legal review`, per
[anti-hallucination](../anti-hallucination/SKILL.md).

## Cookies/consent banner

Verified in M15: only the session cookie and a theme preference in localStorage; no analytics or third-party
scripts, so no banner. Adding either needs a documented decision first.
