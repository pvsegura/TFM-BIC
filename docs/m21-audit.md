# M21 audit — what a user actually sees (2026-09-30)

Inspected on `main` (437ae24, identical to the deployed demo at `https://tfm-bic.onrender.com`), running
locally (API `NODE_ENV=test` on PGlite, Vite dev server) and walked through in a browser as a visitor, a
student and a teacher at 1280 px and 390 px. Screenshots were taken for review only and are not committed.
Nothing here is inferred from plans or ADR intentions unless marked as such.

## Current application state

- **Public**: the M20A homepage (ten-scene scroll story around _szkoła_), `/learn` catalog, auth flows,
  privacy notice. The homepage's "Watch" scene says, correctly, that "playback is not available yet".
- **Signed-in student**: dashboard (points + achievements summary + "Go to lessons"), lessons list and one
  lesson (text blocks → practice exercises → "Complete lesson"), vocabulary browse/detail/"mine",
  phonetics browse/detail, `/learn/videos`, achievements, profile.
- **Deployed configuration**: `AUDIO_GENERATION_PROVIDER=disabled`, `VIDEO_GENERATION_PROVIDER=disabled`,
  fake email (docs/deployment/environments.md, M17). So on the demo **every "Listen" button answers 503** and
  the video page cannot produce anything.
- **There is not a single playable video or pre-recorded audio file anywhere in the product.**

## Video capabilities currently implemented

- M11 (ADR-012): `VideoGenerationService` port; `FakeVideoGenerationService` (default) and
  `HyperframesCliProvider` (shells out to `npx hyperframes render --output <file>`); a `VideoDefinition` content
  type (`content/languages/pl/videos/*.json`, **one** definition: `pl-a1-nasal-vowels-demo`); one hand-authored
  12-second, three-scene composition in `content/video-scripts/pl-a1-nasal-vowels-demo/`; a job table
  `video_generation_jobs` with `queued → processing → completed|failed`; `POST /video-generations` +
  status polling; the `/learn/videos` "Video generation" demo page with a **"Generate video" button any
  signed-in student can press**.
- `HyperframesCliProvider` has **never run a real render** (ADR-012). The job's `mediaReference` is a local
  file path that nothing serves, so even a successful job could not be watched ("preview pending").
- **Cost exposure if re-enabled as is**: rendering is triggered by a student click (rate-limited per route,
  but still a user-triggered, CPU-heavy render on the web server).

## Audio capabilities currently implemented

- M12 (ADR-013): `AudioGenerationService` port; `FakeAudioGenerationService` (0.25 s tone),
  `DisabledAudioGenerationService`, `GeminiAudioProvider` (REST, Interactions API, `gemini-3.8-flash-tts`,
  one prebuilt voice `Kore` for both profiles, `store: false`, bounded retries, 20 s timeout).
- Domain `VoiceProfile` is only `standard | slow` — a speed, not a narrator. No per-lesson voice.
- Runtime generation: `POST /audio-generations` for a vocabulary item's lemma/example, in-memory LRU cache,
  4 concurrent calls, 30/hour per route. **Every page visit that presses Listen may call the provider**; nothing
  is stored, so each restart pays again.
- `GeminiAudioProvider` has **never been executed against the real API** (ADR-013).
- ADR-013 leaves real use **PENDING** two provider-terms questions: Gemini API users must be 18+ and the
  API must not be used in a service "likely to be accessed by individuals under the age of 18"; in the
  EEA/UK/CH only Paid Services may be used to serve users.

## Lesson architecture

- Content JSON under `content/languages/<lang>/levels/<level>/content/`, schema-validated, loaded by a
  catalog repository; `type: lesson | explanation`; ordered `blocks` (`explanation`, `example`, `dialogue`).
- Polish A1 has **5 items**: 4 lessons (`pl-greetings`, `pl-introducing-yourself`, `pl-polite-words`,
  `pl-spelling-and-sounds`) and 1 explanation (`pl-no-articles`). A2–C2 are README-only (no content).
- 9 exercises, linked to lessons. Lesson progress (`not_started | in_progress | completed`) and M8 points
  exist server-side.
- **No lesson has any media relationship.** The lesson page is text → practice → complete.

## Vocabulary architecture

- `content/languages/pl/vocabulary/*.json`: 6 categories, **29 published items** (lemma, translation, level,
  part of speech, gender, plural, note — each optional except lemma/translation).
- **Only 1 of 29 items has an example sentence** (`pl-dom`: "Mój dom jest mały."). Two more appear verbatim
  inside a lesson sentence (`pl-kot` in "Kot śpi.", `pl-czesc` in "Cześć! Mam na imię Anna."). The other 26
  have no example anywhere in the content. Examples must not be invented (brief §44) — see "Missing content".
- Detail page: word, translation, facts, example (if any), "Listen" (runtime TTS), save/mark learned.

## Teacher dashboard status

| Question              | Finding                                                                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exists?               | Yes (M13, ADR-024): overview cards, roster with search/filter/sort/paging, one-student detail.                                                                                                                                  |
| Route                 | `/teacher`, `/teacher/students/:studentId`, inside `ProtectedRoute` + `TeacherRoute`.                                                                                                                                           |
| Backend               | `/teacher-dashboard/*`: session → `TEACHER` role (403 before any read) → teacher–student link.                                                                                                                                  |
| Role / relationship   | `users.role = TEACHER`; `teacher_students` table.                                                                                                                                                                               |
| Navigation            | "Teaching" link shown only to `TEACHER`.                                                                                                                                                                                        |
| Direct URL as student | Page shows "Teachers only"; the API refuses independently (verified by M13 tests).                                                                                                                                              |
| Broken?               | **No.** Verified working locally with a teacher linked to a student.                                                                                                                                                            |
| Real problem          | **No teacher account can exist** unless an operator runs `pnpm --filter @tfm-bic/data teacher:admin promote/link` against the database. Nothing documents doing this for the demo, so on the demo nobody can see the dashboard. |
| Video visibility      | None (there are no videos yet).                                                                                                                                                                                                 |

Minor: the "Accuracy" card renders "No attempts yet" in the large number style (wraps to three lines).

## UX problems discovered

| #   | Pri | Problem                                                                                                                                                                       |
| --- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | P0  | Demo: every "Listen" button fails (audio `disabled` → 503).                                                                                                                   |
| 2   | P1  | No lesson or vocabulary video exists; lessons are text-first.                                                                                                                 |
| 3   | P1  | `/learn/videos` is a developer demo ("A foundation for generating educational videos (M11)") with a student-facing "Generate video" button — not a video library.             |
| 4   | P1  | Teacher dashboard unreachable in practice (no teacher account; no documented procedure).                                                                                      |
| 5   | P2  | Signed-in header wraps to three rows at 1280 px: 8 links + the raw email + "Log out" + theme toggle on its own row.                                                           |
| 6   | P2  | Dashboard is points-only: no "continue where you left off" / next lesson — the learner has to find the next step.                                                             |
| 7   | P2  | Lesson page ends in "Complete lesson" + "Back to lessons"; no link to the lesson's vocabulary or to the next lesson.                                                          |
| 8   | P2  | `/progress` and `/settings` render "This route is an architectural placeholder for Milestone 1". Not linked from the nav, but reachable (and `/settings` was a planned link). |
| 9   | P3  | The theme ignores the OS preference (a dark-scheme browser gets the light theme).                                                                                             |
| 10  | P3  | Teacher "Accuracy" card typography (above).                                                                                                                                   |

No console errors besides the expected pre-login `401` from the session probe.

## Broken/missing routes

- None return a crash. Placeholders: `/progress`, `/settings`. `*` → "Not found" placeholder.
- Missing for M21: a video/media delivery path (nothing serves media files; the SPA server has no HTTP Range
  support, which browsers need for seeking in video).

## Missing content

- Example sentences for 28/29 vocabulary items (26 have none anywhere). **Flagged for content authoring; not
  invented in M21.** Vocabulary videos show what the data has (word, meaning, pronunciation, grammar facts,
  note, and an example only when the content provides one).
- No A2+ content. No Polish lesson for numbers/family/food/travel (vocabulary exists without a lesson).

## Missing media

- 0 lesson videos, 0 vocabulary videos, 0 stored audio clips, 0 posters, 0 captions.

## Existing provider integrations

- Gemini TTS: adapter implemented, never run for real, disabled in the demo.
- Hyperframes: CLI adapter implemented, never run for real, disabled in the demo.
- Host prerequisites on this laptop: Node 24 ✓, Chrome ✓, **FFmpeg ✗** (Hyperframes needs it for encoding
  and audio mixing).

## Existing media storage

- **None.** ADR-012/013 both mark durable media storage PENDING; no object store, no AWS (forbidden).
- Render Free's filesystem is ephemeral (M17), so files written at runtime on the host would be lost.
- CSP already allows `media-src 'self' blob:`.

## Existing ADR decisions (relevant)

ADR-007 content architecture; ADR-011 AI architecture (ports/adapters); ADR-012 video (Hyperframes, jobs,
storage PENDING); ADR-013 audio (Gemini, no storage, terms PENDING); ADR-015/028 hosting (Render Free +
Neon Free); ADR-022 vocabulary; ADR-024 teacher dashboard; ADR-027 security; ADR-030 homepage.

## Recommended M21 implementation

1. **Generate offline, serve static.** Media is produced by an operator CLI pipeline, never by a page visit:
   content → video script (JSON, derived from content) → per-scene TTS (Gemini, one voice profile per lesson)
   → Hyperframes composition from a template → render MP4 + poster + WebVTT captions → media manifest →
   API exposes `VideoAsset`/`AudioAsset` for a content id → the SPA plays them. Idempotent by a content hash.
2. **Storage**: needs a user decision (see the M21 plan) — the lowest-cost option compatible with Render Free
   is committing the (small, compressed) generated files with the content and serving them from the same
   origin with Range support.
3. **Lesson page**: hero video → explanation → examples → vocabulary → practice → complete → next.
4. **Vocabulary**: per-word video + pre-generated pronunciation clip; honest "Video coming soon" otherwise.
5. **Replace** the M11 student-facing "Generate video" demo with a video library.
6. **Teacher**: document and script the demo teacher provisioning; small UX fixes; show lesson video
   availability in the student detail.
7. UX P2 fixes: header, dashboard "continue", lesson next steps, placeholder routes.
