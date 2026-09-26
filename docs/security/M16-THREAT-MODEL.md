# M16 — Threat Model (lightweight)

Status: M16, 2026-09-26. A STRIDE-flavoured sketch of the **current** system, used to decide
which M16 controls address a real attack surface. It is not exhaustive.

## System in one picture

```
Browser (React SPA) ──same origin──▶ [host / reverse proxy: PENDING, ADR-015]
                                          │
                                          ▼
                              Fastify API (single instance)
                         ┌──────────┼─────────────┬─────────────┐
                         ▼          ▼             ▼             ▼
                   PostgreSQL   content/ files   Gemini TTS   Hyperframes CLI
                   (Neon, TBD)  (read at start)  (disabled:   (disabled: fake
                                                 fake default) default, execFile)
                   Email: fake provider only (in memory, nothing sent)
```

Trust boundaries: browser ↔ API (everything from the browser is untrusted); API ↔ database
(trusted, credentials in env); API ↔ providers (responses untrusted, keys secret); CI ↔ repository
(Jenkins reads the repo, holds the SonarQube token).

## Actors

| Actor                          | Capability today                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Anonymous visitor              | Public catalog, register, login, reset, verify, newsletter confirm/unsubscribe links.                     |
| Authenticated student          | Own lessons, exercises, points, vocabulary, phonetics, audio/video generation, profile, export, deletion. |
| Authenticated teacher          | Everything a student can, plus read-only data of **linked** students.                                     |
| Malicious authenticated user   | Any of the above with a crafted client: forged bodies, ids, replays, concurrency.                         |
| Malicious unauthenticated user | Brute force, enumeration, flooding, cross-site requests from their own site.                              |
| Compromised session            | Whatever the session's user can do until expiry/logout/reset/deletion.                                    |
| Malicious API client           | Direct HTTP without a browser: no `Origin`, arbitrary headers, spoofed `X-Forwarded-For`.                 |
| Compromised provider           | Could return malformed/hostile responses; could leak what we send (catalog text only).                    |
| Operator (DB/CLI access)       | Promotes teachers and links students (`teacher:admin`); no admin UI or admin role exists.                 |
| Content author                 | Commits JSON content; validated at start-up; no runtime authoring. No admin/author role in the app.       |

## Assets

Accounts and credentials (password hashes, session/reset/verification tokens), personal data
(email, names, learning history), teacher–student links, answer keys, points/achievements,
email preferences and newsletter consent, generated media (audio returned inline, never stored),
`AUTH_SESSION_SECRET`, `EMAIL_LINK_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`, the SonarQube token
in Jenkins.

## Threats and where M16 stands

| Threat                         | Surface                                   | Existing / M16 control                                                                                            |
| ------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Account takeover (guessing)    | `/auth/login`, deletion password check    | Argon2id, per-IP limits; **M16: per-account login limit, per-user deletion limit (S-02, S-03)**                   |
| Account takeover (reset)       | `/auth/password-reset/*`                  | 256-bit hashed tokens, 1 h; **M16: atomic single use (S-05)**; `Referrer-Policy: no-referrer` (S-06)              |
| Rate-limit bypass / global DoS | Every limited route behind a proxy        | **M16: explicit `TRUST_PROXY` allowlist (S-01)**                                                                  |
| Privilege escalation           | Role in body, teacher routes              | Role never read from input; `requireRole`; operator-only promotion. **M16: route-inventory test**                 |
| IDOR/BOLA                      | Teacher student detail, video jobs        | Session-derived identity, roster-scoped SQL, identical `404`. **M16: matrix + inventory test**                    |
| Session theft                  | Cookie                                    | `HttpOnly`, `SameSite=Strict`, `Secure` (prod), server-side revocation. **M16: HSTS in staging/production**       |
| CSRF                           | State-changing routes                     | `SameSite=Strict`, Origin check, JSON-only parsing, no CORS. **M16: `Sec-Fetch-Site` fallback (S-13)**            |
| XSS                            | Rendering of content, names, achievements | React text only, banned-API scan test. **M16: CSP for the SPA (S-06)**                                            |
| Clickjacking                   | SPA pages (deletion, settings)            | **M16: `frame-ancestors 'none'` + `X-Frame-Options: DENY`**                                                       |
| SQL injection                  | Search, sort, ids                         | Parameterised Drizzle; allowlisted `ORDER BY`. No change.                                                         |
| Command injection              | Hyperframes CLI                           | `execFile`, no shell, validated script path. No change.                                                           |
| SSRF                           | —                                         | No user-controlled server fetch exists. Nothing to add.                                                           |
| Business-logic abuse           | Points, scores, completion, replays       | Server-authoritative, unique constraints, advisory lock. No change.                                               |
| Enumeration                    | Register/resend/reset, teacher lookup     | Generic bodies, identical 404s, per-account limit counts unknown emails too. Timing gap documented (S-17).        |
| Cost abuse                     | Audio/video generation                    | Per-IP limits, cache, concurrency cap. **M16: per-user limits (S-04)**                                            |
| Resource exhaustion            | Bodies, slow requests, log flooding       | Per-route body limits. **M16: default 16 KiB body, request timeout, 4xx no longer logged as errors (S-07, S-10)** |
| Information disclosure         | Errors, 404s, headers                     | Generic 500s, log scrubbing. **M16: safe 4xx bodies, generic 404, no-store default (S-06–S-08)**                  |
| Secret leakage                 | Git, env files, logs                      | No secrets found in history; log redaction. **M16: `.gitignore` fix, stronger prod config (S-09, S-11)**          |
| Dependency compromise          | npm packages                              | Frozen lockfile. **M16: `pnpm audit` CI stage (S-16)**; secret scanning PENDING                                   |
| CI/CD compromise               | Jenkins controller                        | Credentials in Jenkins store; Docker socket risk documented (S-19)                                                |
| Replay                         | Tokens, answers, completions              | Single-use tokens (now atomic), idempotent rewards.                                                               |
| Race conditions                | Rewards, progress, tokens                 | DB constraints and atomic upserts; **M16: atomic token consumption**                                              |

## Out of scope (no surface or not decided)

Uploads, webhooks, SSO/OAuth, MFA, admin UI, multi-instance deployment, backups and database
roles (hosting PENDING), WAF/CDN. These are listed so that their absence is a documented fact,
not an assumption.
