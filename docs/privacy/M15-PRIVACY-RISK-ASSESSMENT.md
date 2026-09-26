# M15 privacy risk assessment (technical)

Status: LIVE — a lightweight engineering check, **not a DPIA** and not a determination of whether one is legally
required. Not legal advice — see the [disclaimer](README.md). Criteria are taken from the European Commission's
description of when a DPIA is required (see [sources](M15-GDPR-SOURCES.md)); applying them to this product is left
to the legal/privacy reviewer.

## 1. Current implementation

| Area                                   | Present today?                                                                                                         | Engineering observation                                                                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Large-scale monitoring                 | No. No tracking, analytics or public-area monitoring                                                                   | Request logs record IPs for operations only                                                                                               |
| Systematic profiling                   | Limited: progress metrics, "active in the last 7 days", accuracy — shown to the student and a linked teacher           | Descriptive metrics, no scoring of the person, no automated decision with effects                                                         |
| Special-category data                  | Not collected by design                                                                                                | **Free-text exercise answers** could contain anything a user types; they are stored, exported, deleted, never shown to teachers or logged |
| Children / minors                      | No age collected; the product is not declared as targeting children                                                    | Nothing prevents a minor from registering. Gemini terms forbid services likely to be accessed by under-18s (ADR-013) — **PENDING**        |
| Large-scale sensitive data             | No                                                                                                                     | —                                                                                                                                         |
| Extensive AI processing                | No. Gemini (off by default) receives catalog text only; Hyperframes is local; neither receives user data               | —                                                                                                                                         |
| Automated decision-making              | No decisions with legal or similarly significant effects                                                               | Exercise evaluation is a deterministic answer check                                                                                       |
| Behavioural tracking                   | No                                                                                                                     | Browser storage: session cookie + theme only                                                                                              |
| Teacher visibility of student progress | Yes, operator-linked                                                                                                   | Least-privilege allowlist, audit log; students are not informed which teacher — **PENDING**                                               |
| Security of processing                 | Argon2id, hashed tokens, SameSite=Strict + Origin check, rate limits, allowlisted responses, error-log scrubbing (M15) | No security headers (CSP, HSTS…) are set by the API; to be decided with hosting                                                           |

## 2. Future planned features (NOT current processing)

| Feature (roadmap)                          | Why it would need fresh analysis before launch                                                                                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kids / minors mode                         | Age-specific rules may apply; would need age handling, possibly parental involvement; conflicts with the Gemini terms recorded in ADR-013. **Do not collect date of birth in advance.** |
| AI tutor / conversational AI               | Would send user-provided text to an AI provider — a new external personal-data flow                                                                                                     |
| Speech recognition / pronunciation scoring | Voice recordings; possible biometric questions                                                                                                                                          |
| Self-service teacher invitations, classes  | Changes who decides the link; notice/consent question from M13                                                                                                                          |
| Subscriptions / payments                   | Financial records with likely legal retention requirements — would change the deletion matrix                                                                                           |
| Real email provider                        | New processor, transfers, suppression lists                                                                                                                                             |

## 3. Pending legal/product review

- Whether any current or planned processing requires a DPIA.
- Controller identity and contact; processor roles and DPAs; transfer mechanisms (hosting, DB, email).
- Lawful basis per processing purpose ([register](PROCESSING-REGISTER.md)).
- Retention periods (logs, backups, inactive accounts, consent evidence).
- Whether acknowledgement of the privacy notice must be recorded.
- Minimum age / whether the service is "likely to be accessed" by minors.
- Teacher-link notice or consent for students.
- Final privacy-notice wording.

## Residual technical risks

| Risk                                                                                                 | Mitigation in place / next step                                                           |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Logs keep IPs and user ids beyond account deletion                                                   | Minimal fields; retention to be set with hosting                                          |
| `FakeEmailProvider` holds up to 500 messages (addresses, link tokens) in memory in every environment | Only exposed under `NODE_ENV=test`; disappears once a real provider replaces it (ADR-014) |
| Rate limits are per IP and in memory (reset on restart, not shared across instances)                 | Documented; revisit when scaling beyond one instance                                      |
| Profile routes have no rate limit (pre-existing, M4)                                                 | Low impact (own data only); candidate hardening                                           |
| No CSP/HSTS/frame-ancestors headers from the API                                                     | To be configured at the hosting/reverse-proxy layer (ADR-015)                             |
| Backups could retain deleted accounts                                                                | Decide backup retention at provisioning                                                   |
