# Environments

Status: ACCEPTED (M17) | Related: [ADR-015](../adr/adr-015-deployment.md) (hosting PENDING), [ADR-028](../adr/adr-028-production-runtime-and-deployment.md), [M17 deployment architecture](../production/M17-DEPLOYMENT-ARCHITECTURE.md)

## Environments

`development`, `test`, `staging`, `production` — each with its own database (or at minimum
schema/isolation), provider API keys, and env-var set. Exact staging/production hosting is
PENDING (ADR-015).

## Environment variables

`.env.example` at the repo root (created in M0) lists every required variable **name**, grouped by
concern, with no real values. Never commit a populated `.env`.

Variable groups (see `.env.example` for the authoritative current list):

- `NODE_ENV`, `PORT`, `DEFAULT_LANGUAGE` — read since M1.
- `CONTENT_DIR` (optional, M5) — folder that holds `languages/<code>/…`; unset means the repository's own
  `content/` folder. The API validates it at startup and refuses to start if it is missing or invalid,
  so a deployment must ship `content/` with the API or set this (ADR-018, ADR-015 PENDING).
- Database: `DATABASE_URL` (Postgres connection string; Neon in production, local Docker Postgres
  in dev, in-process PGlite in `test` — see ADR-005) — read since M3.
- Auth: `AUTH_SESSION_SECRET` (signs the session cookie), `APP_BASE_URL` (verification/reset
  links + Origin validation) — see ADR-006 — read since M3. Since M16, staging/production refuse a secret shorter
  than 32 characters and require `APP_BASE_URL` to be set explicitly to an `https:` URL (it defaults to
  `http://localhost:5173` only in development/test); `APP_BASE_URL` must be an http(s) URL everywhere.
- Proxies (M16, ADR-027): `TRUST_PROXY` — comma-separated IP addresses/CIDR ranges of the reverse proxies allowed
  to set `X-Forwarded-For`. Empty (default) = trust none: `request.ip` is the socket peer. `true`, hop counts and
  host names are refused (they let any client spoof its address and escape per-IP rate limits).
- `E2E_RELAXED_RATE_LIMITS` — test-only (Playwright); since M16 refused unless `NODE_ENV=test`.
- Email (M14, ADR-014/ADR-025): `EMAIL_PROVIDER` (`fake`, the default — captures in memory, sends nothing; or
  `resend` — refused under `NODE_ENV=test`), `RESEND_API_KEY` (secret; required with `resend`), `EMAIL_FROM` (default
  `TFM-BIC <no-reply@example.invalid>`, which `resend` refuses — use an address on the domain verified in Resend),
  `EMAIL_REPLY_TO` (optional; both refuse line breaks), `EMAIL_LINK_SECRET` (≥ 32 chars, signs newsletter
  unsubscribe links; required in staging/production, ephemeral in dev/test; rotating it breaks links in sent
  newsletters). `APP_BASE_URL` must be the exact public origin (e.g. `https://www.verbysia.com`): email links and
  the Origin check are built from it.
- Audio generation (M12, ADR-013): `AUDIO_GENERATION_PROVIDER` (`fake` default, or `gemini`),
  `GEMINI_API_KEY` (required only when the provider is `gemini`), `GEMINI_TTS_MODEL` (default
  `gemini-3.8-flash-tts`, GA), `AUDIO_GENERATION_MAX_TEXT_LENGTH` (default 300, 1–500) — read by
  `packages/config`. development/test/CI/Playwright: `fake` (a deterministic WAV tone, no key, no
  network); `loadEnv` refuses `gemini` when `NODE_ENV=test`. staging/production: `fake` until the
  provider-terms decision in ADR-013 is made (Gemini forbids services likely to be used by under-18s;
  EEA deployments need a paid project); then `gemini` with a key from the host's secret store.
- Video generation (M11): `VIDEO_GENERATION_PROVIDER` (`fake` default, or `hyperframes`) — read by
  `packages/config`. `fake` selects a real, committed adapter (never Hyperframes); it is what every
  automated test and CI run uses. `hyperframes` selects `HyperframesCliProvider`, which shells out
  to `npx hyperframes render` — implemented against Hyperframes' verified, no-auth-required local
  CLI, but not executed end-to-end in the implementation environment (see
  `content/video-scripts/README.md` and ADR-012). No API key: local self-hosted Hyperframes
  rendering needs no credential. Real use requires Node 22+, FFmpeg and headless Chrome on the
  host — none confirmed available until ADR-015 (hosting) is resolved.
- Production readiness (M17, ADR-028): `WEB_DIST_DIR` — the built SPA the API serves from its own origin
  (required in staging/production; unset in development/test, where Vite serves it and proxies the API paths, see
  `apps/web/vite.config.ts`); `APP_VERSION` — build identifier shown by `/health` (default `development`, set by the
  image). Production additionally refuses `EMAIL_PROVIDER=fake`, `AUDIO_GENERATION_PROVIDER=fake`, any
  `VIDEO_GENERATION_PROVIDER` but `disabled`, a loopback `APP_BASE_URL`/`DATABASE_URL` host, and a `DATABASE_URL`
  without `sslmode=require|verify-ca|verify-full`. Audio and video accept `disabled` everywhere (503, no provider call).
  The former reserved `API_BASE_URL`/`WEB_BASE_URL` were removed: nothing read them, and the SPA calls its own origin.
- Observability (M18, ADR-029): `LOG_LEVEL` — `error|warn|info|debug`, default `info`; production refuses `debug`
  (NODE_ENV=test is always silent). `METRICS_TOKEN` — optional secret (≥ 32 chars); when set, `GET /internal/metrics`
  exists and answers only `Authorization: Bearer <METRICS_TOKEN>`. Unset = no metrics endpoint. Host secret store only.
  See [docs/observability-data-policy.md](../observability-data-policy.md).

## Security checklist for a deployment (M16, ADR-027)

Hosting is PENDING (ADR-015). Whatever host is chosen must, before real users (M17 implemented items 1, 2 and the
start-up checks of 4; see [the M17 deployment architecture](../production/M17-DEPLOYMENT-ARCHITECTURE.md)):

1. Serve the SPA (`apps/web/dist`) with **exactly** the headers in `apps/web/src/security/security-headers.ts`
   (CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP) and
   HSTS once HTTPS is guaranteed. `vite preview` shows the expected result; the `production-build` E2E project
   checks the build runs under them.
2. Serve the SPA and the API from **one origin** over HTTPS (the session cookie is `SameSite=Strict`, and the
   Origin check compares with `APP_BASE_URL`); keep the page-vs-API split for `/profile` (see vite.config.ts).
3. Set `TRUST_PROXY` to the proxy's address range if the API sits behind one — otherwise every client shares
   one per-address rate-limit bucket. Never trust all proxies.
4. Set `NODE_ENV=production`, a ≥ 32-character `AUTH_SESSION_SECRET` and `EMAIL_LINK_SECRET`, and an
   `https:` `APP_BASE_URL` from the host's secret store (the API refuses to start otherwise).
5. Connect to Postgres over TLS with an application role that is not a superuser and does not own the schema
   (migrations run with a separate role); decide backups/restore and log retention (risk SR-21).
6. Run a single API instance, or add a shared rate-limit store first (limits are in memory).

## Startup validation

The API must validate required environment variables (presence and basic shape) at process
startup and fail fast with a clear error, rather than failing unpredictably later when a missing
variable is first used.

## Promotion path

`development` (local) → `test` (CI) → `staging` (pre-production, the production image with `NODE_ENV=staging`) →
`production`. One image per commit is built once and promoted unchanged (M17). Deploy targets for staging/production
are PENDING (ADR-015); until then `infrastructure/docker/validate-image.sh` runs a throwaway staging.
