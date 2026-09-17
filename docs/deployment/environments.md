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
- Database: `DATABASE_URL` (Postgres connection string; Neon in production, local Docker Postgres
  in dev, in-process PGlite in `test` — see ADR-005) — read since M3.
- Auth: `AUTH_SESSION_SECRET` (signs the session cookie), `APP_BASE_URL` (verification/reset
  links + Origin validation) — see ADR-006 — read since M3.
- Email provider: `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM` — provider account PENDING (ADR-014);
  not read by M3 code (dev/test use the in-memory email adapter).
- Gemini: API key — not yet read (M12, out of scope until then).
- Hyperframes: config, if any auth is required (UNKNOWN — see ADR-012) — not yet read.
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
