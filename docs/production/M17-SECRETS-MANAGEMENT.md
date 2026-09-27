# M17 — Secrets Management

Date: 2026-09-27 · No secret value appears in this document or anywhere in the repository.

## Rules

- Secrets live only in the **hosting platform's secret store** (runtime) and **Jenkins credentials**
  (CI). Never in Git, the Dockerfile, an image layer, a build argument, the frontend bundle, or a log.
- Every environment has its **own** values; staging never reuses a production secret.
- Verified in M17: gitleaks v8.30.1 found no secret in the 259 commits; `.dockerignore` excludes every
  `.env*`; the image carries only `NODE_ENV`, `PORT`, `APP_VERSION`, `WEB_DIST_DIR`, `CONTENT_DIR`
  (checked by `validate-image.sh`); build arguments are only the version and commit; configuration
  errors name variables but never print values (unit-tested).
- The SPA has no `VITE_*` variables, so no configuration of any kind is compiled into it.

## Inventory

| Secret                            | Category        | Used by                   | Injected by                            | Who needs access            | Rotation impact                                                                                                  |
| --------------------------------- | --------------- | ------------------------- | -------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` (app role)         | Database        | API container             | Host secret store                      | Runtime only                | New password → update the variable → restart. Brief errors while old connections drain.                          |
| `DATABASE_URL` (migrator role)    | Database        | Migration step            | Jenkins credential / operator's shell  | Deployment job, DB operator | Rotate independently of the app; next migration uses the new one.                                                |
| Provider admin/owner credentials  | Database        | Creating roles, restores  | Provider console (MFA)                 | DB owner only               | Not used by any automated process.                                                                               |
| `AUTH_SESSION_SECRET`             | Session signing | API                       | Host secret store                      | Runtime only                | **Every session becomes invalid** — all users are logged out.                                                    |
| `EMAIL_LINK_SECRET`               | Link signing    | API                       | Host secret store                      | Runtime only                | **Unsubscribe links in already-sent newsletters stop working** (users can still unsubscribe from their profile). |
| Email provider API key            | Provider        | API (adapter not written) | Host secret store                      | Runtime only                | Create new key → deploy → revoke old. Email fails in between if done out of order.                               |
| `GEMINI_API_KEY`                  | Provider        | API (when `gemini`)       | Host secret store                      | Runtime only                | Same as above; audio returns 503 while the key is invalid.                                                       |
| Hyperframes                       | —               | —                         | —                                      | —                           | Local CLI needs no credential; disabled in production.                                                           |
| `tfm-bic-registry` (deploy token) | CI/CD           | Jenkins "Push Image"      | Jenkins credential (username/password) | Jenkins only                | New token → update credential. Never a person's password.                                                        |
| Hosting deploy token              | CI/CD           | Future deploy stages      | Jenkins credential                     | Jenkins only                | PENDING with the provider.                                                                                       |
| SonarQube token                   | CI/CD           | Jenkins                   | Jenkins "Secret text"                  | Jenkins only                | Existing (M2).                                                                                                   |
| `SMOKE_EMAIL` / `SMOKE_PASSWORD`  | Test account    | Post-deploy smoke test    | Jenkins credential                     | Jenkins only                | Dedicated account, never a person's. Change password → update credential.                                        |

Non-secret configuration (`APP_BASE_URL`, `TRUST_PROXY`, `EMAIL_FROM`, provider names) is set as
ordinary environment variables on the host.

## Generating values

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"   # ≥ 32 chars
```

## Rotation procedure

Never rotated automatically. Planned rotation (or immediately after a suspected leak):

1. Generate the new value (above) or create a new provider key/DB password.
2. Update it in the host's secret store (and Jenkins if it is a CI credential). Do not paste it in
   chat, tickets or commit messages.
3. Redeploy/restart the container (a new `docker run`/release — the app reads secrets at start-up).
4. Verify: `/ready`, then the smoke test.
5. Revoke the old value at the provider (after the new one is confirmed working).
6. Record the date and reason (no values) in the operations log.

DB password rotation: `ALTER ROLE tfm_app PASSWORD '…'` (as the admin role) → update `DATABASE_URL`
→ restart. The old password stops working immediately for new connections, so do steps 2–3 promptly.

## Development and test

- Development: `.env` (git-ignored); missing secrets fall back to ephemeral per-process values
  (sessions do not survive restarts). The local Docker Postgres password in `docker-compose.yml` is a
  documented dev-only value bound to `127.0.0.1`.
- Test/CI: no secrets needed — PGlite, fake providers, throwaway values committed in the Playwright
  config; `validate-image.sh` and `restore-drill.sh` generate one-time random secrets per run.

## Jenkins

- Credentials only through `withCredentials` bindings (masked in logs); registry passwords via
  `--password-stdin`, never on a command line.
- No stage echoes environment variables; `validate-image.sh` never prints the generated values.
- Use deployment-specific tokens with the least scope the provider offers (push-only registry token,
  deploy-only hosting token), not a developer's personal credentials.
