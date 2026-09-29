# ADR-030: Public homepage — scroll-driven story without a motion library, self-hosted display face

Status: ACCEPTED (M20A) / PENDING USER DECISION: search indexing of the staging demo, canonical origin, social
preview image, Terms and Contact pages
Date: 2026-09-29

## Context

Until M20A, `/` rendered a placeholder. The milestone asks for a public homepage with its own identity, at
least eight connected scenes, scroll-linked motion, full reduced-motion support, mobile-first layout, real
routing/auth, no invented data and no copied identity. Constraints found in the repository
([docs/m20a-homepage-audit.md](../m20a-homepage-audit.md)): a strict CSP (`script-src`/`style-src`/`font-src
'self'`), a main bundle already above Vite's 500 kB warning, no interface localisation (one locale seam:
achievement texts), content-as-data with a guard against language names in code, one real language (Polish,
A1 available) and a four-colour token set.

## Decision

1. **The homepage is one lazy route** (`index`, `lazy` → `pages/home-page.tsx`) with `handle: { fullBleed: true }`;
   `RootLayout` stays the only layout and drops its centred column for such routes. The root route has a quiet
   `hydrateFallbackElement` for the first load of a lazy route.
2. **No animation library.** One shared scroll driver (passive listeners, one `requestAnimationFrame` per frame,
   all rects read before any write, IntersectionObserver-limited) writes each scene's progress as `--p`
   through the CSSOM; CSS derives every transform from it. Chosen over GSAP/Framer Motion (bundle size on an
   already-large app) and over CSS `animation-timeline` (not available in every browser the app supports).
   Details: [docs/m20a-motion-system.md](../m20a-motion-system.md).
3. **Pinning only with motion on wide viewports (≥ 960px).** Small screens and reduced motion get normal-flow
   scenes; `prefers-reduced-motion` renders every scene in its settled state with identical content.
4. **Display face: Bricolage Grotesque** (variable, OFL-1.1) self-hosted through
   `@fontsource-variable/bricolage-grotesque`, weight axis only (latin ≈ 41 kB, latin-ext ≈ 19 kB, fetched per
   unicode range). Used by the homepage and the header wordmark; the rest of the app keeps the system font.
   Self-hosting keeps `font-src 'self'` unchanged.
5. **Copy is data.** All homepage text lives in `homepage/content/homepage.en.json`, typed on import and
   selected by `homepageContent(locale)` — translation means adding a file. Examples are verbatim A1 content,
   always labelled as examples; which languages and levels are open comes from the public catalog API; a guard
   test refuses statistics, ratings, hyperbole and price claims.
6. **Tokens extend, not replace.** New colour tokens (`accent-ink` for AA orange text, success/danger pairs,
   night paper), `--font-display`, `--ease-thread` and duration tokens sit beside the M0 brand colours.
7. **Visual regression is opt-in** (`PW_VISUAL=1`, project `homepage-visual`): settled reduced-motion
   screenshots, Windows baselines committed; not run by Jenkins (Linux).

## Consequences

- Main bundle grows by ~1.8 kB (router, menu); the homepage costs one extra request (≈ 24 kB JS + 21 kB CSS,
  ≈ 13 kB gzipped together) plus the font files, and nothing on other pages.
- Scroll-linked styling recalculates style for the visible scenes' subtree once per frame while scrolling;
  only `transform`, `opacity`, `stroke-dashoffset` and `clip-path` change.
- Browsers without `:has()` lose only the selected-option styling of the example exercise (the native radio
  still works); without `svh` units the sticky stages fall back to the stylesheet's defaults.
- Search engines see the SPA shell's generic description until JavaScript runs; there is no prerendering.

## Pending (user decisions)

- Whether the staging demo should be indexed at all (robots.txt currently allows public pages).
- A canonical URL and `og:url` need a fixed public origin; a social preview image (`og:image`) needs an asset.
- Terms and Contact pages do not exist; the footer links only to existing pages.
