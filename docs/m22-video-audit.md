# M22 — Audit of the M21 videos (version 1, prototypes)

Inspected 2026-10-01: frames extracted from every published MP4, captions and transcripts read, scripts
re-derived from `buildLessonVideoScript`/`buildVocabularyVideoScript` (script version 1, template 1), measured
against [m22-pedagogical-framework.md](m22-pedagogical-framework.md).

| Video                            | Length | Teaches                             | Does well                                                                                                 | Does poorly                                                                                                                                                                                             |
| -------------------------------- | ------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| lesson `pl-greetings`            | 2:00   | 6 greetings, formality              | Every phrase heard twice; meaning and note shown; captions synced                                         | No situation: formality and time of day (the point of the lesson) are only _told_; no retrieval; reads the explanation paragraph aloud as text on screen                                                |
| lesson `pl-introducing-yourself` | 2:13   | name, origin, "nice to meet you"    | Dialogue present (chat bubbles); recap                                                                    | Dialogue is floating bubbles, not two people meeting; no retrieval of a turn; long text explanation scene                                                                                               |
| lesson `pl-polite-words`         | 1:52   | proszę/dziękuję/przepraszam/tak/nie | Recap grid                                                                                                | The lesson's key idea — _proszę_ has three uses that the situation decides — is shown as one card with three translations, i.e. without the situations; near-empty frames between explanation sentences |
| lesson `pl-no-articles`          | 1:36   | no articles                         | Examples with notes                                                                                       | "a cat"/"the cat" shown as text only, though it is entirely about situational reference (one cat known vs any cat)                                                                                      |
| word `pl-dom`                    | 0:36   | dom, plural, example                | Pictogram drawn while meaning is spoken; plural highlighted when spoken; example with the word underlined | Icon on a blank page, not a house in a street; one context only; no retrieval                                                                                                                           |

## Weaknesses common to all five

**Pedagogical**

- WATCH → HEAR → REPEAT → END: "Listen and repeat" twice, then the meaning. **No retrieval moment, no
  feedback** (framework principles 1, 2, 9).
- Meaning is delivered by translation text before any visual or situational meaning (principles 2, 10).
- No second context; no recall at the end beyond re-reading cards (principle 3).
- Explanations are paragraphs read aloud with the same text on screen (redundant, long).

**Visual**

- Slide deck: heading + big text + fade; no people, no places, no objects (except one pictogram).
- `TFM-BIC · A1` brand on every frame (must be only `A1`).
- Dialogue as chat bubbles; recap as a card grid.
- Empty frames: the explanation scene's sentences appear only as each is read, leaving a heading alone for
  ~1 s at scene start.

**Audio**

- One narrator voice speaks _everything_, including both sides of the dialogue (Anna and Piotr both voiced by
  "Marek"), which breaks the illusion of a conversation and gives no talker variability.
- Narration and target-language clips are clear (mean ≈ −18.7 dB, peaks ≈ −1.5 dB); Polish pronunciation not
  yet reviewed by a native speaker.

**Contextual / CEFR**

- A1 learners get long English paragraphs; the situations that make the language comprehensible are missing.

**Verdict:** all five are **version 1 prototypes**. They are replaced, not edited (see ADR-032). The other 29
planned targets were never published (quota stop) and will be generated directly in version 2.
