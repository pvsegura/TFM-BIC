# Environments

Status: PROPOSED | Related: [ADR-015](../adr/adr-015-deployment.md)

## Environments

`development`, `test`, `staging`, `production` — each with its own database (or at minimum
schema/isolation), provider API keys, and env-var set. Exact staging/production hosting is
PENDING (ADR-015).

## Environment variables

`.env.example` at the repo root (created in M0) lists every required variable **name**, grouped by
concern, with no real values. Never commit a populated `.env`.

Planned variable groups (names only — actual list finalized when `apps/api`/`apps/web` are
scaffolded):

- `NODE_ENV`
- Database: `DATABASE_URL`
- Auth: session/JWT secret(s) — name PENDING (ADR-006)
- Email provider: API key — provider PENDING (ADR-014)
- Gemini: API key
- Hyperframes: config, if any auth is required (UNKNOWN — see ADR-012)
- App: `PORT`, `API_BASE_URL`, `WEB_BASE_URL`

## Startup validation

The API must validate required environment variables (presence and basic shape) at process
startup and fail fast with a clear error, rather than failing unpredictably later when a missing
variable is first used.

## Promotion path

`development` (local) → `test` (CI) → `staging` (pre-production, mirrors production config) →
`production`. Deploy targets for staging/production are PENDING (ADR-015).
