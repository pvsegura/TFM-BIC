# M20A — Homepage motion system

How the public homepage moves, why, and where to change it. Companion to
[m20a-homepage-audit.md](m20a-homepage-audit.md).

## 1. The idea in one line

**Scroll is the clock.** Each scene exposes one number, `--p` (0 → 1), that says how far the reader has
scrolled through it. Everything that moves is a CSS function of that number. No timeline plays by itself
(except a sub-second entrance of the hero's decorative notes), nothing hijacks the wheel, and stopping the
scroll stops the motion.

## 2. Motion grammar

Every scene follows the same four phases, derived in CSS from `--p` on `.scene`:

| Phase     | Range of `--p` | Custom property | What happens                                                                       |
| --------- | -------------- | --------------- | ---------------------------------------------------------------------------------- |
| ENTER     | 0 → 0.2        | `--enter`       | Supporting elements emerge: short rise (≤ 24px) + fade.                            |
| FOCUS     | 0.2 → 0.55     | `--focus`       | The scene's main concept becomes dominant: the thread draws, the figure assembles. |
| TRANSFORM | 0.55 → 0.85    | `--transform`   | The concept changes form (a word splits, a wave flattens, lines collapse).         |
| EXIT      | 0.85 → 1       | `--exit`        | The figure settles into the shape the next scene starts from (the hand-off).       |

Each phase value is clamped to 0–1 and has a smoothstep-eased twin (`--focus-e` etc., `x²(3−2x)`), so
motion eases in and out even though scroll maps linearly to progress.

### The orange thread

One visual element carries the story: an orange line (the existing `accent` token). Its role per scene:

| #   | Scene           | The thread is…                                                       | Hand-off to the next scene                   |
| --- | --------------- | -------------------------------------------------------------------- | -------------------------------------------- |
| 01  | Discover (hero) | the underline of the word _szkoła_                                   | the underline lifts into connector lines     |
| 02  | Understand      | connectors from the word to its spelling, sound, meaning and use     | the syllables _szko·ła_ drop to the baseline |
| 03  | Listen          | a waveform with one hump per syllable                                | the wave flattens into a straight line       |
| 04  | Watch           | a video timeline with a moving playhead                              | the playhead reaches the end as a dot        |
| 05  | Practise        | the marker of the chosen answer                                      | the right answer is kept as a word           |
| 06  | Remember        | the links between remembered words                                   | the links collapse onto one horizontal line  |
| 07  | Progress        | a progress rail                                                      | the rail continues as a path                 |
| 08  | Journey         | the CEFR path A1 → C2                                                | the path's start branches                    |
| 09  | Languages       | one solid branch per available language, dashed ones for the roadmap | the solid branch runs on                     |
| 10  | Begin           | the underline of the call to action                                  | —                                            |

Between scenes a vertical **rail** (desktop and tablet only) keeps the thread visually unbroken: scenes butt
against each other on the same paper background, and each scene draws its segment of the rail as it passes.

Scenes 01 and 02 share one pinned stage so the hero's word _is_ the element that splits into its anatomy —
the one true shared-element transition, and the page's signature moment.

## 3. Mechanics

| Piece                             | File                                             | Responsibility                                                                                                                                                                                                                                    |
| --------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sceneProgress()`                 | `apps/web/src/homepage/motion/scene-progress.ts` | Pure maths: element rect + viewport height + mode → 0–1. Unit-tested.                                                                                                                                                                             |
| `scrollDriver`                    | `…/motion/scroll-driver.ts`                      | One passive `scroll`/`resize` listener for the whole page, one `requestAnimationFrame` per frame, **reads all rects, then writes all `--p` values** (no layout thrashing). An `IntersectionObserver` limits the work to scenes near the viewport. |
| `useSceneProgress()`              | `…/motion/use-scene-progress.ts`                 | Registers a scene element with the driver; unregisters on unmount.                                                                                                                                                                                |
| `usePrefersReducedMotion()`       | `…/motion/use-prefers-reduced-motion.ts`         | Reads and follows `prefers-reduced-motion` (synchronously on first render → no flash).                                                                                                                                                            |
| `ScrollScene`                     | `…/motion/scroll-scene.tsx`                      | `<section>` + optional pinned track (`position: sticky` stage) + the progress hook.                                                                                                                                                               |
| Tokens                            | `apps/web/src/styles/index.css`                  | `--ease-thread`, `--duration-quick/base/slow` (shared with the rest of the app).                                                                                                                                                                  |
| Scene lengths, phases, transforms | `apps/web/src/homepage/homepage.css`             | All scroll-linked styling in one file.                                                                                                                                                                                                            |

Progress formulas (`top`/`height` from `getBoundingClientRect`, `vh` = viewport height):

- **pinned** scene (tall track, sticky stage): `p = clamp(−top / (height − vh))` — 0 when the track reaches the
  top of the viewport, 1 when the stage is about to unpin.
- **pass-through** scene: `p = clamp((vh − top) / (vh + height))` — 0 when its top enters from below, 1 when its
  bottom leaves at the top.

Why no library: the whole system is ~150 lines of TypeScript; GSAP/Framer Motion would add tens of kB to a bundle
that already exceeds Vite's warning, and CSS scroll-driven animations (`animation-timeline`) are not yet
available in every browser the app supports (Firefox). The custom-property approach works everywhere the SPA
already runs, and falls back to the static final state.

Why it is CSP-safe: `--p` is written with `element.style.setProperty()` (CSSOM), which `style-src 'self'` permits;
no `style=""` markup, no inline `<style>`.

## 4. Easing and timing tokens

| Token              | Value                            | Use                                                                       |
| ------------------ | -------------------------------- | ------------------------------------------------------------------------- |
| `--ease-thread`    | `cubic-bezier(0.22, 1, 0.36, 1)` | the few time-based transitions (hero notes, answer feedback, mobile menu) |
| `--duration-quick` | 160ms                            | hover/focus feedback                                                      |
| `--duration-base`  | 320ms                            | answer feedback, menu                                                     |
| `--duration-slow`  | 700ms                            | hero entrance of the decorative notes                                     |
| smoothstep         | `x²(3−2x)` in CSS                | scroll-linked phases                                                      |

## 5. Pinning

Pinned (sticky stage inside a taller track): 01+02 shared stage, 03 Listen, 06 Remember, 08 Journey.
Pass-through (normal height, progress still drives the thread): 04, 05, 07, 09, 10. Practise (05) is never
pinned because it is interactive. Track lengths live in `homepage.css`:

| Stage | ≥ 768px | < 768px                    |
| ----- | ------- | -------------------------- |
| 01+02 | 260svh  | 220svh                     |
| 03    | 200svh  | 160svh                     |
| 06    | 200svh  | 160svh                     |
| 08    | 200svh  | not pinned (vertical path) |

`svh` units keep sticky stages stable while mobile browser toolbars show and hide.

## 6. Reduced motion (mandatory)

When `prefers-reduced-motion: reduce` is set:

- the driver is not started; every scene's `--p` is `1` (the settled, fully annotated state);
- the page root carries `data-motion="reduced"`: tracks collapse to their content height, nothing is sticky, the
  01/02 overlay becomes two stacked sections, the hero notes do not animate, the rail is drawn;
- no information depends on motion: every word, sound, gloss, status and link is in the DOM and visible.

The same static layout is what a browser without JavaScript-driven motion, a screen reader or a screenshot test
sees. The global reduced-motion rule in `index.css` still shortens any remaining transition.

## 7. Mobile adaptations

- No rail (the gutter is too narrow); scenes keep their own thread figure.
- Shorter tracks (above); Journey is a vertical, non-pinned path.
- Fewer simultaneous elements: the Remember constellation shows fewer links, the waveform fewer bars.
- The word's size is `clamp()`-ed to the viewport so it never overflows at 320px.

## 8. Where to change things

- **A scene's length or whether it pins** → `ScrollScene` props in the scene component + its track rule in `homepage.css`.
- **Phase boundaries or easing** → the `.scene` block at the top of `homepage.css`.
- **What moves in a scene** → that scene's block in `homepage.css` (search for its class name).
- **Time-based durations** → tokens in `index.css`.
- **Reduced-motion behaviour** → the `[data-motion="reduced"]` block at the end of `homepage.css`.
