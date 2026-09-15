# packages/config

Environment/config loading and validation, shared between `apps/api` and any tooling that needs
config. Must fail fast on missing/malformed environment variables — see
[environments.md](../../docs/deployment/environments.md).

## What's here (M1)

`loadEnv()` (`src/env/`) validates `NODE_ENV`, `PORT`, `DEFAULT_LANGUAGE` — the only variables
any M1 code reads. `DATABASE_URL`/`AUTH_SECRET`/email/Gemini/Hyperframes vars stay out of this
schema until the feature that needs each one is implemented (making them required now would break
plain local dev before those integrations exist).
