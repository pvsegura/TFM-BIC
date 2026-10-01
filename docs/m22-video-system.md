# M22 — Pedagogical video system (how it works and how to run it)

Decision: [ADR-032](adr/adr-032-pedagogical-video-system.md). Why: [m22-pedagogical-framework.md](m22-pedagogical-framework.md).
Storage, delivery and the key handling are unchanged from M21 ([m21-content-generation.md](m21-content-generation.md)).

## From content to video

```
course content (lessons, vocabulary, phonetics)        authored plans (content/languages/pl/media/)
        │                                               lessons/<contentId>.json · plan.json (word contexts)
        └──────────────► ContentLanguage (allowed phrases + meanings + respellings)
                                   │
              buildLessonVideoScript / buildVocabularyVideoScript   ── validates: Polish = content only
                                   │
                         VideoScript v2 (scenes, cast, beats, retrieval, objective)
                                   │
              StoredNarrationSynthesizer — one clip per line, in the speaker's voice profile, reused by hash
                                   │
                    planVideoTimeline (real clip durations, lead-ins, retrieval pauses)
                                   │
              scene/composition.ts — places, characters, props, actions → Hyperframes HTML + GSAP
                                   │
              Hyperframes render → MP4 + poster + WebVTT → content/media + manifest (version, pedagogy)
```

## Authoring a lesson plan

`content/languages/<lang>/media/lessons/<contentId>.json` (schema `lessonVideoPlanSchema`):

- `objective` — one sentence, shown above the player.
- `narrator` and `cast` — voice profile ids from `narrators.json`; a `look` per character (see `LOOKS` in
  `packages/data/src/media/scene/characters.ts`).
- `scenes` — `situation` (stage + beats), `focus`, `contrast`, `retrieval`, `next-step`.
- Lines: `{ "by": "<cast id>", "target": "<course phrase>" }` or `{ "say": "<instruction-language framing>" }`.
  Never put a target-language word inside a `say` line (one language per TTS request).
- Cards: `"card": true` (content meaning) or `{ "meaning": "<part of the content meaning>" }`.
- Actions run in order within the same timing (`lead` = during the silence before the line, `with`, `after`).

`plan` validates every plan against the content; anything invalid is listed as BLOCKED with the reason.

## Commands (CMD)

```
pnpm --filter @tfm-bic/data media plan --priority 3            # targets, blocked, calls needed
pnpm --filter @tfm-bic/data media audition --only ola,piotr,tomek   # 2 clips per voice + median pitch
pnpm --filter @tfm-bic/data media compose --draft --only lesson:pl-polite-words   # projects, no render
pnpm --filter @tfm-bic/data media generate --only lesson:pl-polite-words,vocabulary-item:pl-dom
pnpm --filter @tfm-bic/data media generate --priority 3 --limit 40 --max-calls 100
```

`compose` writes `.media-build/projects/<type>-<id>/index.html`; opening it in a browser and seeking `window.__timelines.main` (a small local Playwright helper was used in M22, not committed) gives frames in seconds.

## Visual system

| Part       | Where                   | Notes                                                                                                                                              |
| ---------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Characters | `scene/characters.ts`   | 11 looks (adults, children, barista, shopkeeper); jointed; scaled 1.12 for 720p                                                                    |
| Places     | `scene/environments.ts` | street, suburb, café, home, kitchen, bedroom, shop, station, office, school, park, airport; day/evening/night skies; foreground layer for counters |
| Props      | `scene/props.ts`        | cup, milk jug, house, cat, dog, book, briefcase, food, ticket, suitcase, train, clock, flags, counted units                                        |
| Actions    | `scene/composition.ts`  | enter/walk/exit, turn, point, raise-hand, wave, nod, shake-head, handshake, give, pick-up, show/hide, highlight, sleep                             |
| Overlays   | same                    | CEFR badge only, phrase cards near the speaker, retrieval prompt + countdown + answer + self-check                                                 |

## Status (2026-10-01)

- All 5 lesson plans and 29 word contexts validate (0 blocked); drafts composed and reviewed frame by frame.
- Real audio/video for version 2: generated in batches as the Gemini daily quota allows (see the M22 report).
