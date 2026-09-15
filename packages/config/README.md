# packages/config

Environment/config loading and validation, shared between `apps/api` and any tooling that needs
config. Must fail fast on missing/malformed environment variables — see
[environments.md](../../docs/deployment/environments.md).
