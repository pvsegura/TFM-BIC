# packages/data

Repository implementations and infrastructure adapters (PostgreSQL access, `HyperframesProvider`,
`GeminiAudioProvider`, email provider adapter, content-filesystem adapter). The only package
allowed to import external SDKs/DB drivers directly — it implements interfaces owned by
`packages/domain`/`packages/application`.

See [database skill](../../.claude/skills/database/SKILL.md),
[hyperframes skill](../../.claude/skills/hyperframes/SKILL.md),
[gemini-audio skill](../../.claude/skills/gemini-audio/SKILL.md).
