# Environments

Status: PROPOSED | Related: [ADR-015](../adr/adr-015-deployment.md)

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
  links + Origin validation) — see ADR-006 — read since M3.
- Email provider: `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM` — provider account PENDING (ADR-014);
  not read by M3 code (dev/test use the in-memory email adapter).
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
- App: `API_BASE_URL`, `WEB_BASE_URL` — reserved, not yet read. In M3 dev, `apps/web`'s Vite dev
  server proxies `/auth/*` to `apps/api` (see `apps/web/vite.config.ts`) so the browser sees a
  single origin and no CORS policy is needed — this also keeps `SameSite=Strict` on the session
  cookie workable. Production same-origin serving (reverse proxy or single origin) is a
  deployment concern tracked under ADR-015, not solved in M3.

## Startup validation

The API must validate required environment variables (presence and basic shape) at process
startup and fail fast with a clear error, rather than failing unpredictably later when a missing
variable is first used.

## Promotion path

`development` (local) → `test` (CI) → `staging` (pre-production, mirrors production config) →
`production`. Deploy targets for staging/production are PENDING (ADR-015).
