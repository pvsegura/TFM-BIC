# M21 — Generating educational media (operator guide)

Everything here runs on the operator's machine. Nothing runs on the host, and no page visit generates media.
Architecture: [m21-video-architecture.md](m21-video-architecture.md); decision: [ADR-031](adr/adr-031-video-first-educational-media.md).

## Prerequisites

- Node 22+ (24 used), `pnpm install` in the repository.
- Chrome (Hyperframes finds or downloads a headless Chrome) and **FFmpeg + FFprobe** on `PATH`, or set
  `FFMPEG_PATH` / `FFPROBE_PATH` to the executables. Windows: `winget install --id Gyan.FFmpeg -e`.
- For real audio: a Gemini API key from a project **with billing enabled** (ADR-013: EEA users may only be
  served with paid services).

## The Gemini key — never in Git, logs or the browser

1. Variable: `GEMINI_API_KEY` (optional `GEMINI_TTS_MODEL`, default `gemini-3.8-flash-tts`).
2. Where: either the environment of the shell that runs the pipeline, or a file `.env.media.local` at the
   repository root containing `GEMINI_API_KEY=...`. `.env.*` is git-ignored.
3. Environment: only the operator machine. The deployed app does not need it (it serves stored files;
   `AUDIO_GENERATION_PROVIDER` can stay `disabled`).
4. Check it is set: `pnpm --filter @tfm-bic/data media doctor` prints `GEMINI_API_KEY configured` — never the
   value.
5. Check it is not exposed: `git check-ignore -v .env.media.local` shows the ignore rule; `git status` does not
   list the file; the manifest records `gemini:<model>` only.

## Commands (CMD examples)

```
cd C:\Users\usuario\TFM-BIC-m21
set "FFMPEG_PATH=C:\...\ffmpeg.exe"
set "FFPROBE_PATH=C:\...\ffprobe.exe"

pnpm --filter @tfm-bic/data media doctor
pnpm --filter @tfm-bic/data media plan --priority 3
pnpm --filter @tfm-bic/data media audition
pnpm --filter @tfm-bic/data media generate --draft --only lesson:pl-greetings
pnpm --filter @tfm-bic/data media generate --only lesson:pl-greetings,vocabulary-item:pl-dom
pnpm --filter @tfm-bic/data media generate --vocabulary --category greetings --limit 5
pnpm --filter @tfm-bic/data media generate --lessons --priority 1 --limit 5 --max-calls 150
```

| Flag                         | Meaning                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| `--only type:id,...`         | exact targets (`lesson:<contentId>`, `vocabulary-item:<id>`)                                  |
| `--lessons` / `--vocabulary` | one kind (default: both)                                                                      |
| `--category <id>`            | one vocabulary category                                                                       |
| `--priority 1-3`             | include plan entries up to this priority (default 1)                                          |
| `--limit n`                  | generate at most n targets this run (default 3, max 40); up-to-date ones are skipped free     |
| `--max-calls n`              | stop before a target once n provider calls were made (default 60, max 400)                    |
| `--force`                    | regenerate even if up to date (never the default)                                             |
| `--draft`                    | silence instead of speech, written to `.media-build/draft-media` — for layout checks, no cost |

`audition` writes one English and one Polish clip per narrator to `.media-build/audition/` (not published) so
narrator voices can be heard before anything is generated at scale.

## Priorities (from `content/languages/pl/media/plan.json`)

1. All 5 A1 lessons/explanations; words of the categories the lessons use (greetings, everyday life).
2. The other categories (numbers, family, food, travel).
3. Reserved for future content.

## After generating

Review the video (content, audio, timing, legibility), then commit `content/media/` (files + manifest) with
the content change. The API reads the manifest at start-up. `plan` shows what is up to date, outdated (script,
narrator or template changed) or failed.

## Cost and limits (verified 2026-09-30)

- Gemini `gemini-3.8-flash-tts`: $0.50 / 1M input text tokens, $9.00 / 1M audio output tokens, 25 audio tokens
  per second → ≈ $0.0135 per minute of generated speech (prices double from 2027-01-01). Rate limits depend on
  the account tier and are shown only in AI Studio — UNKNOWN here.
- Whole Polish A1 plan: `plan --priority 3` reports ~171 new clips; total speech is well under an hour, so the
  estimated paid cost is below one US dollar. Hyperframes rendering is local and free.
- Storage: MP4 ≈ 25 KB per second of video at 1280×720 (2-minute lesson ≈ 3 MB; 30 s word ≈ 0.7 MB).

## Teacher accounts for the demo (M13 operator CLI, unchanged)

The teacher dashboard only shows up for a `TEACHER` linked to students. Promote and link with the existing
CLI against the target database (CMD):

```
set "DATABASE_URL=<the database connection string from the host's secret store>"
pnpm --filter @tfm-bic/data teacher:admin promote teacher@example.com
pnpm --filter @tfm-bic/data teacher:admin link teacher@example.com student@example.com
```

Both accounts must already be registered and verified. Run it against production data only deliberately.
