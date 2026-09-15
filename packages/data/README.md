# packages/data

Repository implementations and infrastructure adapters (PostgreSQL access, `HyperframesProvider`,
`GeminiAudioProvider`, email provider adapter, content-filesystem adapter). The only package
allowed to import external SDKs/DB drivers directly — it implements interfaces owned by
`packages/domain`/`packages/application`.

See [database skill](../../.claude/skills/database/SKILL.md),
[hyperframes skill](../../.claude/skills/hyperframes/SKILL.md),
[gemini-audio skill](../../.claude/skills/gemini-audio/SKILL.md).

## What's here (M1)

`SystemClock` (`src/clock/`) — the only concrete adapter so far, implementing `@tfm-bic/application`'s
`Clock` port with real `Date`/wall-clock I/O. No PostgreSQL/provider adapters yet — ADR-005's
provider decision is still PENDING, and M1 must not couple domain/application to an unpicked
provider.
