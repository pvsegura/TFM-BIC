# External data flows

Status: LIVE — verified from the adapters' code on 2026-09-26. Not legal advice — see the [disclaimer](README.md).

Legend: **personal data** (about a user) · **educational content** (catalog files) · **generated content**
(audio/video) · **provider metadata** (keys, references).

## Gemini text-to-speech (M12) — `GeminiAudioProvider`

Selected only with `AUDIO_GENERATION_PROVIDER=gemini` (default `fake`; refused under `NODE_ENV=test`, so no test or
CI run can call it).

```
Student (session)
  ↓  POST /audio-generations { source: { vocabularyItemId, part }, voice }   ← the client never sends text
API
  ↓  looks up the entry in the catalog (visibility rules)
Educational content: the lemma or example sentence (catalog text) + a fixed style instruction
  ↓  POST generativelanguage.googleapis.com/v1beta/interactions   (x-goog-api-key, store: false)
Google Gemini
  ↓  base64 WAV
Generated content → cached in memory by (text, voice) → returned to the student
```

- **Sent:** catalog text, a style string chosen by the server, the API key (provider metadata).
- **Never sent:** user id, email, names, session, progress, anything typed by the user. The request originates from
  the server, so Google sees the server's address, not the user's.
- Personal data in this flow: **none identified**. Google's own retention of requests (per ADR-013: stored by default
  unless `store: false`; paid-tier content logged 30 days for abuse monitoring) applies to catalog text only.
- PENDING before enabling: the age-restriction and EEA paid-tier terms (ADR-013, risk #17).

## Hyperframes video rendering (M11) — `HyperframesCliProvider`

Selected only with `VIDEO_GENERATION_PROVIDER=hyperframes` (default `fake`). Never executed for real so far.

```
Student (session)
  ↓  POST /video-generations { videoDefinitionId }
API → video_generation_jobs row (user_id, definition id, status)          ← personal data stays in the DB
  ↓  npx hyperframes render --output content/video-scripts/<id>/output.mp4 (local child process)
Educational content: the authored HTML project for that definition
  ↓
Generated content: one file per definition, shared by everyone who requests it
```

- **Nothing about the user leaves the server.** The render is local; the project is authored content.
- `npx` may download the `hyperframes` package from the npm registry at run time — a supply-chain concern (tracked
  in ADR-012), not a personal-data flow.

## Email (M3/M14) — `EmailProvider`

Only `FakeEmailProvider` exists (`EMAIL_PROVIDER=fake`, the only accepted value): **nothing leaves the process**.

```
Identity / newsletter use case
  ↓  template (escaped) → message: to, from, reply-to, subject, text, html, List-Unsubscribe
EmailProvider port
  ↓  FakeEmailProvider: kept in memory (last 500), never sent
(future) real provider — PENDING ADR-014
```

A real adapter would send: **recipient address (personal data)**, subject and body (may contain link tokens —
security-sensitive), sender addresses. Marketing messages go only to confirmed subscribers
(`MarketingRecipient`). Before connecting one: DPA, location/transfers, suppression and deletion API — see
[THIRD-PARTY-SERVICES.md](THIRD-PARTY-SERVICES.md).

## Database and hosting

- PostgreSQL: Neon chosen (ADR-005) but never provisioned — region, backups and transfer situation **PENDING**.
- Hosting for API/web/logs: **PENDING** (ADR-015). Whatever is chosen receives all traffic and the logs (IP
  addresses, user ids in events).

## Browser → third parties

None. `index.html` loads only the app bundle; no fonts, analytics, tags or embeds from other origins.

## AI data-minimisation rules (enforced)

1. The client names content, never text (`/audio-generations` strict schema; E2E asserts client text is refused).
2. The adapter builds the request from the domain `SpeechRequest` only — it has no access to the user.
3. `store: false` is sent.
4. Logs record ids, voice, provider, sizes and outcome — never the text or audio.
5. Any future AI feature that would send user-provided text (e.g. an AI tutor) is **out of M15 scope** and must be
   added to this document, the processing register and the risk assessment first.
