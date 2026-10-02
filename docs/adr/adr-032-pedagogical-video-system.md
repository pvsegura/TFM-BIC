# ADR-032: Pedagogical video system — evidence-informed scenes, retrieval, characters and voices

Status: ACCEPTED (M22) / PENDING: voice audition for character voices (Aoede, Puck, Charon), native-speaker
review of Polish audio, legal review of the Gemini under-18 clause (ADR-013/031)
Date: 2026-10-01 · Supersedes the _script and template_ parts of [ADR-031](adr-031-video-first-educational-media.md)
(its storage, delivery, offline generation and cost controls stand).

## Context

M21 published five videos (four lessons, one word). The M22 audit ([m22-video-audit.md](../m22-video-audit.md))
found them to be narrated text slides: no situation, no retrieval, one voice for every role, the product name on
every frame. The milestone asks for videos that teach — grounded in second-language-acquisition and
multimedia-learning evidence — with real places, illustrated characters that act, retrieval and feedback,
pronunciation support, a consistent voice per character within a lesson and CEFR-aware pacing, without
inventing language or provider capabilities. Evidence and its strength: [m22-pedagogical-framework.md](../m22-pedagogical-framework.md).

## Decisions

1. **Video is the primary learning modality, designed as a mini-lesson.** Default sequence situation → meaning →
   target → form → conversation → notice → retrieve → feedback → reuse → recall, adapted per lesson. Segments
   correspond to learning units (segmenting, signaling — Rey 2019; Schneider 2018).
2. **Pedagogical scene model (domain, provider-free).** `VideoScript` v2: cast (each character with a voice
   profile), scenes of kinds _situation_ (place, props, characters, beats with timed actions and phrase cards),
   _focus_ (form noticed, content respelling, panels), _contrast_ (two sounds, articulation diagrams),
   _retrieval_, _next-step_; objective, target vocabulary ids and phrases; level pacing. React never sees scripts.
3. **Authored plans decide place and action, never language.** `content/languages/<lang>/media/lessons/*.json`
   and `plan.json` (per-word visual contexts). The builder rejects any target-language line, card or sign that is
   not course content; meanings come from the content (a plan may only select a part of the content's own
   translation). A lesson without a plan or a word without a visual context is **blocked**, not filled.
4. **Retrieval inside videos.** Cue (scene frozen, target highlighted) → prompt → silent pause with a visible
   countdown (A1 3.5 s; B1+ 2.5 s) → answer by the character → self-check ("Did you say it? Say it once more, out
   loud.") → answer again. Evidence: Karpicke & Roediger 2008; Kang et al. 2013; Carpenter & Olson 2012
   (pictures help when paired with retrieval). A video cannot hear the learner, so feedback is a self-check, never
   pretend praise; enforced retrieval stays in the exercises.
5. **Contextualized vocabulary.** A word is met in a place where its meaning is visible (a house in a suburb,
   bread at the shop), said by a character, its form shown, used in the content's own example when there is one,
   heard again in a second context and voice (talker variability), then retrieved with the first scene as cue.
6. **Pronunciation visualisation.** Perception before production (moderate evidence: Sakai & Moorman 2018):
   listen, contrast, say. Simplified side-view tongue diagrams only where the phonetics content describes the
   articulation (sz "tongue tip curls further back", ś "tongue body raised toward the hard palate"), labelled as a
   listening guide; the content's own respellings ("SHKO-wa"); no clinical claims.
7. **Voice consistency.** Every line is synthesized with its speaker's voice profile (narrator or character):
   same Gemini prebuilt voice, model, language handling and fixed style for that character throughout a lesson.
   Different lessons may use different characters/voices. This is _configuration_ consistency; Gemini does not
   guarantee identical-sounding generations and its custom/replicated voices were not adopted. Voice pitch is
   measured at audition (median F0) because Google documents descriptors, not pitch or gender.
8. **Hyperframes role (unchanged provider, new template).** Renders the composition: SVG environments with a
   foreground layer, jointed characters (arms, legs, head, blinking, mouth only while speaking), props, actions
   (enter, walk, point, wave, nod, shake head, handshake, give, pick up, highlight, sleep) as GSAP attribute tweens
   on one paused timeline — verified deterministic under seeking. Only the CEFR level is shown; no product name.
9. **Gemini role (unchanged).** `gemini-3.8-flash-tts`, one request per line, offline only; pacing and Retry-After
   handling for the account's quota (≈10 requests/min, ~100/day observed).
10. **Versioning.** Script version 2 and template version 2 are part of each video's source hash, together with
    every voice used; a changed script, content, voice or template marks a video _outdated_. The manifest records
    a version number per content item, earlier versions (sourceHash, script version, date), the objective,
    segments, retrieval count and character voices.
11. **Cost control.** Unchanged from ADR-031 (explicit command, plan with call estimate, draft mode, limits),
    plus a `compose` command that writes render projects without rendering for visual review, and reuse of every
    identical clip (same voice, language, text).
12. **CEFR awareness.** `pedagogyFor(level)` sets retrieval pause and introductory repetitions; plans for higher
    levels are expected to use longer exchanges, less scaffolding and register/pragmatics (only A1 content exists).

## Alternatives considered

- **Editing the M21 videos** — rejected by the audit: the problem was the absence of situations and retrieval,
  not cosmetics.
- **Generic auto-generated scenes from content alone** — would place words in arbitrary places; meaning needs a
  deliberate situation. Plans are small, reviewed content.
- **Photorealistic or AI-generated imagery** — inconsistent characters across scenes, unverifiable content,
  licensing questions; simple consistent SVG characters are readable and deterministic.
- **Interactive (in-browser) retrieval with answer checking** — the exercises already do this; the video's job is
  to prompt recall and model the answer.
- **Background music** — omitted; speech clarity first (coherence principle).

## Consequences

- Each lesson needs an authored plan (an hour of careful work); vocabulary contexts are a few lines each.
- Generation cost grows with voices per lesson (~240 calls for the whole A1 set), still well under a few dollars at
  published paid rates, but it spans days at the observed daily quota.
- Characters are simple; animation quality is "clear and purposeful", not cinematic.
- Synthetic voices still need native-speaker review; until then, the phonetics content keeps advising native
  speakers.

## References

[m22-pedagogical-framework.md](../m22-pedagogical-framework.md), [m22-video-audit.md](../m22-video-audit.md),
[m22-video-system.md](../m22-video-system.md), [ADR-031](adr-031-video-first-educational-media.md),
[ADR-012](adr-012-video-generation.md), [ADR-013](adr-013-audio-generation.md).

## Addendum 2026-10-02 — product decisions

- **Words: audio, not video.** The product owner decided that vocabulary items do not need explainer videos;
  each word card (vocabulary list, lesson word list, word page) has a play button for the word's recorded
  pronunciation, plus the example when the content has one. The pipeline publishes _audio-only_ targets for
  words (own source hash, same idempotency and reuse); the word visual contexts in `plan.json` stay as authored
  material (they choose the character voice) and could drive word videos again later. Decision 5 above now
  applies inside lesson videos only.
- **Visual continuity:** every page uses the homepage's exercise-book paper and margin line; page changes fade
  out/in via the View Transitions API (fade-in fallback; off with reduced motion).
