# content/video-scripts

Hyperframes render projects (HTML/timeline definitions) for generated lesson videos. Each
subfolder is one provider-specific render project, referenced by `scriptPath` from its
`VideoDefinition` metadata file under `content/languages/<languageId>/videos/`. Nothing above the
`HyperframesCliProvider` adapter (`packages/data/src/video/video-generation/hyperframes-cli.provider.ts`)
ever reads what is inside a subfolder — see [ADR-012](../../docs/adr/adr-012-video-generation.md)
and the [hyperframes skill](../../.claude/skills/hyperframes/SKILL.md).

## `pl-a1-nasal-vowels-demo/`

M11's one vertical-slice video: a 12-second, three-scene HTML timeline introducing Polish's two
nasal vowels (ą, ę), reusing the example words already in
`content/languages/pl/phonetics/vowels.json` (`pl-ipa-onasal`/`pl-ipa-enasal`) rather than
duplicating them. Hand-authored against Hyperframes' verified public documentation (the
`data-start`/`data-duration`/`data-track-index` attribute convention) but **not executed against
the real `npx hyperframes render` CLI** in this milestone — no verified FFmpeg/headless-Chrome
availability was confirmed in the implementation environment, and
[ADR-015](../../docs/adr/adr-015-deployment.md) (hosting) is still PENDING. Automated tests and the
default `VIDEO_GENERATION_PROVIDER=fake` never read this folder's contents at all; only a real,
manually-configured `VIDEO_GENERATION_PROVIDER=hyperframes` run would.
