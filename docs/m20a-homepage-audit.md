# M20A — Homepage visual audit

Date: 2026-09-29 · Branch: `feature/public-homepage` (from `feature/observability`, M18).
Scope: what the web app looks like today, what the public homepage can reuse, and what it has to add.
Everything below was read from the repository; nothing is assumed.

## 1. Current visual system

| Aspect                 | What exists                                                                                                                                                                                                                                                                        | Where                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Styling                | Tailwind CSS v4 through `@tailwindcss/vite`; no `tailwind.config`, tokens in a CSS `@theme` block                                                                                                                                                                                  | `apps/web/src/styles/index.css`                  |
| Tokens                 | Four colours only: `primary` rgb(20 35 60) navy, `accent` rgb(255 107 53) orange, `surface` rgb(248 249 250) off-white, `surface-dark` rgb(15 20 30)                                                                                                                               | same file                                        |
| Typography             | Tailwind's default system sans stack; no webfont; sizes `text-sm`…`text-2xl`, weights `font-medium`/`font-semibold`                                                                                                                                                                | every page                                       |
| Spacing / radius       | Tailwind defaults; `rounded-md` (buttons), `rounded-lg` (cards); pages sit in `max-w-3xl`/`max-w-5xl` columns                                                                                                                                                                      | pages, layout                                    |
| Shadows                | None used                                                                                                                                                                                                                                                                          | —                                                |
| Buttons                | `Button` primitive (`primary` = navy text on orange, AA ~5.5:1; `secondary` = outlined)                                                                                                                                                                                            | `packages/ui/src/button`                         |
| Cards                  | Bordered boxes (`border-primary/20`), e.g. `StatCard`, `LessonCard`                                                                                                                                                                                                                | `apps/web/src/components`                        |
| Forms                  | `TextField` primitive with label + error                                                                                                                                                                                                                                           | `packages/ui/src/text-field`                     |
| Navigation             | One header in `RootLayout`: wordmark "TFM-BIC", `Home`, `Learn`, then auth-dependent links (Dashboard, Lessons, Vocabulary, Phonetics, Videos, Achievements, Teaching, Profile, e-mail, Log out) or `Log in`/`Register`; dark-mode toggle. Wraps with `flex-wrap` — no mobile menu | `apps/web/src/layouts/root-layout.tsx`           |
| Footer                 | One link: "Privacy notice"                                                                                                                                                                                                                                                         | same                                             |
| Icons                  | No icon library. Achievements and avatars are hand-drawn glyphs                                                                                                                                                                                                                    | `achievement-icon.tsx`, `packages/ui/src/avatar` |
| Illustrations / images | None. No `public/` folder, no favicon, no robots.txt                                                                                                                                                                                                                               | —                                                |
| Dark mode              | Manual: `.dark` class on `<html>` from a persisted Zustand store (`tfm-bic-theme`), `@custom-variant dark`; default light                                                                                                                                                          | `state/theme-store.ts`                           |
| Motion                 | None besides `transition-colors` on buttons; a global `prefers-reduced-motion` rule shortens every animation/transition                                                                                                                                                            | `index.css`                                      |
| Focus                  | Global `:focus-visible` orange 2px outline                                                                                                                                                                                                                                         | `index.css`                                      |

## 2. The route the homepage replaces

`/` renders `RoutePlaceholder("TFM-BIC", "Language-learning platform — home.")`. `<title>` is the static
`TFM-BIC — Language Learning` in `index.html`; there is no meta description.

## 3. Constraints found (they shape every decision)

- **CSP** (`packages/contracts/src/web/web-security-headers.ts`): `script-src 'self'`, `style-src 'self'`,
  `font-src 'self'`, `img-src 'self' data:`. → no Google Fonts/CDN, no inline `<style>`/`style=""` markup. Style
  properties set from JS through the CSSOM (what React does) are allowed. A self-hosted font is allowed.
- **SPA served by the API** from memory, one explicit route per file (`apps/api/src/web/web-app.ts`); `.svg`, `.txt`,
  `.woff2` are already known content types → `public/robots.txt` and a favicon work in staging/production.
- **No interface localisation**: the UI is English; the one locale seam is the achievement texts
  (`packages/application/src/gamification/achievement-texts.ts`, keyed by locale). The homepage copy must follow the
  same shape so it can be translated later.
- **Content is data** (`content/languages/<code>/`); React must not hard-code educational text as product facts.
  The homepage shows _illustrative examples_, taken verbatim from the shipped Polish A1 content and labelled as
  examples; live facts (languages, levels and their status) come from the public catalog API.
- **Real product facts** (all from the repo): one language (Polish, `polski`); level A1 `available`, A2–C2
  `planned`; five A1 lessons; exercise types multiple-choice / true-false / text-answer; vocabulary statuses
  new → saved → learning → learned; "Listen" on vocabulary entries at normal or slow speed (M12); one demo video
  definition ("Nasal vowels: ą and ę") with no playable media yet (M11); points: exercise +10, lesson +25,
  achievement +50; achievements "First exercise", "First lesson", "Ten exercises", "One hundred points"; other
  languages (English, Spanish, German, French, Italian, Portuguese) appear only in `docs/product/roadmap.md`
  (status PROPOSED, not scheduled).
- **No users, testimonials, statistics, partners or pricing exist** → none are shown.
- **Pages that exist for the footer**: `/privacy` (public), `/learn` (public). **Missing**: Terms, Contact (the
  privacy notice itself marks the controller contact PENDING), a public data-management page (data export/deletion
  lives in the signed-in `/profile`). Copyright holder in `LICENSE`: "2026 pvsegura".
- **Bundle** ≈ 582 kB and Vite already warns above 500 kB → the homepage must not add a motion library and should
  be split from the main chunk.
- **Tests**: Vitest + RTL (jsdom), Playwright (`chromium` against Vite dev, `production-build` against
  `vite preview` with the real CSP). No axe; no screenshot tests exist.
- **Known issue**: the skip link uses white on orange (~2.8:1), recorded in current-state.

## 4. Limitations of the current system for a public homepage

1. Four colour tokens: no scale (muted text, rules, tints, dark surfaces) — pages use `/70` opacity hacks.
2. No typographic identity: system font, no display face, no type scale.
3. Header wraps into several lines on phones when signed in; no menu.
4. `<main>` is capped at `max-w-5xl` with side padding — nothing can be full-bleed.
5. No motion vocabulary, no tokens for duration/easing.
6. No favicon, no description, no robots.txt.

## 5. Recommended visual direction

**"Annotated language" — the editorial language of a dictionary entry and a teacher's margin notes, brought to
life by one orange thread.** Language study already has a strong, original visual grammar that no SaaS template
uses: headwords, syllable dots (`szko·ła`), IPA between slashes, part-of-speech labels, glosses, stress marks,
ruled paper. The homepage treats these as the illustration itself — typography is the visual, not a picture of a
dashboard.

One continuous **orange thread** (an SVG line, the existing accent colour) runs through the story and changes role
in every scene: it underlines the first word, links the word to its meaning, becomes a sound wave, a video
timeline, the answer marker of an exercise, the links between remembered words, a progress rail, the CEFR path,
the branches to other languages and finally the underline of the call to action. That single element carries the
narrative continuity the brief asks for.

- Navy is the ink, off-white the paper, orange the thread and the teacher's pen. Dark mode is "night paper":
  deep navy paper, warm off-white ink, the same orange — not an inversion.
- One typeface with personality — **Bricolage Grotesque** (variable, OFL-1.1, self-hosted via Fontsource) — for
  display and body copy on the homepage and the wordmark; the rest of the app keeps its system font (unchanged).
  IPA symbols that the font lacks fall back per glyph to the system font.
- No photos, stock illustrations, blobs, glassmorphism, logo walls, fake numbers or three identical cards.

## 6. Components to reuse

| Reused                                                    | How                                                                                                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RootLayout` (header, footer, skip link, theme effect)    | Stays the single layout. Gains a mobile menu, a richer footer and a full-bleed mode for routes that ask for it (`handle`). No parallel "PublicHeader". |
| `useCurrentUser`                                          | The only source of auth state for CTAs and nav.                                                                                                        |
| `useLanguages`, `useLanguageLevels`                       | Real language and level status for the Journey and Languages scenes (public catalog, not user-scoped).                                                 |
| `useThemeStore`                                           | Unchanged; the homepage styles both themes through the existing `.dark` variant.                                                                       |
| Colour tokens `primary`/`accent`/`surface`/`surface-dark` | Kept; extended with a derived scale, not replaced.                                                                                                     |
| Global focus style and reduced-motion rule                | Kept; the homepage adds its own static fallbacks on top.                                                                                               |

## 7. Components to create

- `pages/home-page.tsx` — composes the scenes; sets the document title/description.
- `homepage/content/homepage-content.ts` — all copy and example data, keyed by interface locale.
- `homepage/motion/` — `scene-progress.ts` (pure maths), `scroll-driver.ts` (one shared rAF-batched scroll loop),
  `use-scene-progress.ts` (hook), `use-reduced-motion.ts`, `scroll-scene.tsx` (the pinned/unpinned scene wrapper).
- `homepage/scenes/` — one component per scene (10) plus `thread.tsx` (the orange thread primitive).
- `homepage/homepage.css` — the homepage's scene styles, driven by the `--p` custom property.
- Header `MobileMenu` behaviour inside `RootLayout`; `SiteFooter` content.

## 8. Open items found by the audit (not implemented in M20A)

- **Missing pages**: Terms of use and Contact do not exist (the privacy notice itself marks the controller contact
  PENDING); data export/deletion is only reachable signed in, on `/profile`. The footer links only to pages that
  exist. PENDING USER/LEGAL DECISION.
- **Visitor navigation**: Lessons, Vocabulary and Phonetics are protected routes, so the public header keeps
  showing only Home, Learn, Log in and Register to visitors (linking them would bounce to the login page).
- **SEO**: no canonical/`og:url` (no fixed public origin is configured at build time), no `og:image` (no asset),
  no structured data (no real organisation facts to state). Whether the staging demo should be indexed is PENDING.
- **Anonymous session check**: every page logs a browser-level `401` for `/auth/me` for visitors (ADR-006 design);
  pre-existing, not a homepage error.
