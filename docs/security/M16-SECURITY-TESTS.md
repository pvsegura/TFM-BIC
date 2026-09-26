# M16 — Security Tests

Status: M16, 2026-09-26. What the security tests prove, where they live, and what they do **not** cover. They are
negative tests: each one attempts the attack and asserts the backend refuses it. Passing tests show specific
behaviour. They do not show the absence of vulnerabilities.

The existing per-milestone security tests (M3–M15: IDOR, answer keys, points, mass assignment, injection-shaped
input, export/deletion isolation…) are unchanged and still run. M16 adds the files below and a cross-cutting
guard over all of them.

## New in M16

| File                                                                                 | Proves                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Finding               |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `apps/api/src/security/route-inventory.security.test.ts`                             | Every registered route is classified. Every non-public route answers **401** without a session. Every state-changing route answers **403** to a foreign `Origin` (the RFC 8058 unsubscribe link is the only listed exception). Teacher routes answer **403** to a student. No `_test` route exists outside E2E. No path takes a user id. **Mutation-checked**: removing `authenticate` from `GET /lessons` or `verifyOrigin` from the lesson actions fails it. | Default deny (A01)    |
| `apps/api/src/security/http-hardening.security.test.ts`                              | Security headers on normal, 401, 404 and 400 responses. `no-store` default, and a route's own `Cache-Control` kept. HSTS only in staging/production. Random UUID `X-Request-Id`, with a client-supplied id ignored. Generic 404 without the path. Safe 400/413/415/429 bodies. Generic 500. 16 KiB default body limit. Request timeout set. `X-Forwarded-For` ignored by default and honoured only from a trusted proxy.                                       | S-01, S-06–S-08, S-10 |
| `apps/api/src/security/rate-limits.security.test.ts`                                 | A distributed guess at one account stops after 10 attempts whatever the address. Spelling variants count as one account. Other accounts are unaffected. Unknown and existing addresses are limited identically. Reset stays available. Deletion (5), export (5), audio (30) and video (10) are limited **per user** from ever-changing addresses, with separate budgets per user. Profile reads 120/min and writes 30/min.                                     | S-02–S-04, S-14       |
| `apps/api/src/hooks/verify-origin.test.ts`                                           | Own origin allowed; foreign and look-alike origins refused (`…example.com.evil.example`, `http:` vs `https:`, `null`); absent Origin + `Sec-Fetch-Site: cross-site`/`same-site` refused; `same-origin`/`none` allowed; a foreign Origin wins over a `same-origin` claim.                                                                                                                                                                                       | S-13                  |
| `packages/data/src/identity/*-token.repository.test.ts` (consume)                    | On real SQL (PGlite), for both token types: consumed once, a second use refused, expired (including "expires exactly now") refused and left unused, unknown → not found, **5 simultaneous uses → exactly 1 succeeds**.                                                                                                                                                                                                                                         | S-05                  |
| `packages/application/src/identity/use-cases/{confirm-password-reset,verify-email}…` | Two simultaneous resets or verifications with one token: exactly one succeeds, the other gets `TokenAlreadyUsedError`, and the stored password is the winner's. A failure after consumption cannot be replayed with the same link. These tests were RED against the pre-M16 code (the race reproduced).                                                                                                                                                        | S-05                  |
| `packages/config/src/env/load-env.test.ts` (M16 block)                               | Staging/production refuse a short session secret (without echoing it), a missing or non-https `APP_BASE_URL`, and `E2E_RELAXED_RATE_LIMITS` outside test. `APP_BASE_URL` must be http(s) everywhere (`javascript:` refused). `TRUST_PROXY` accepts IPs/CIDRs and refuses `true`, hop counts, `*`, host names and bad prefixes.                                                                                                                                 | S-01, S-09, S-15      |
| `apps/web/src/security/security-headers.test.ts`                                     | The SPA CSP: `script-src 'self'` only, no `unsafe-inline`/`unsafe-eval`, `default-src`/`object-src`/`base-uri` `'none'`, `frame-ancestors 'none'`, no third-party origin; the header set.                                                                                                                                                                                                                                                                      | S-06                  |
| `apps/web/src/security/zod-without-eval.test.ts`                                     | Zod runs `jitless` (no `new Function` probe) and still validates.                                                                                                                                                                                                                                                                                                                                                                                              | S-06                  |
| `tests/e2e/production-build-security.spec.ts` (project `production-build`)           | The **built** app, served with its headers, renders public and signed-in pages (dashboard, lessons, exercise, vocabulary, phonetics, achievements, profile) with **zero** CSP violations; another origin cannot frame it. **Mutation-checked**: without `frame-ancestors`/`X-Frame-Options` the framing test fails. The violation check found a real issue (Zod's probe) on its first run.                                                                     | S-06                  |

## How to run

```bash
pnpm --filter @tfm-bic/api exec vitest run src/security src/hooks   # API security suites
pnpm test                                                            # everything (Vitest)
pnpm test:e2e                                                        # both Playwright projects
pnpm exec playwright test --config tests/e2e/playwright.config.ts --project=production-build
```

## Gaps (deliberate or environmental)

- **Write flows under CSP**: the E2E API accepts writes only from the dev-server origin, so the `production-build`
  project signs in through the API and checks reads. `blob:` audio playback under the CSP is covered by the policy's
  unit test and by the dev-server audio spec, not by a production-build run.
- **Chrome's Local Network Access check** is turned off for the `production-build` browser only. It would otherwise
  block the framing probe regardless of the app's headers, giving a false pass.
- **Concurrency on real Postgres**: the atomic-consume tests run on PGlite (single connection). The guarantee rests
  on a single conditional `UPDATE`, which Postgres serialises per row; not re-run on a networked Postgres.
- **Real proxies**: `TRUST_PROXY` is tested with `inject` (peer 127.0.0.1) and `X-Forwarded-For`, not behind a real
  proxy. The hosting is PENDING.
- **Timing-based enumeration** (S-17) has no test. It is accepted and documented, not fixed.
- **Jenkins/SonarQube** were not run (standing instruction), so the new `Dependency Audit` stage is verified only by
  running its two commands locally.
