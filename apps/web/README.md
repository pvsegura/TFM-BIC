# apps/web

React 19 + TypeScript (strict) + Vite frontend. Stack decision: [ADR-003](../../docs/adr/adr-003-frontend-stack.md).
Conventions: [.claude/skills/react-typescript](../../.claude/skills/react-typescript/SKILL.md).

## What's here (M1)

- Vite dev server, Tailwind CSS v4 (brand tokens + manual dark mode in `src/styles/index.css`).
- React Router v8 data router (`src/router.tsx`) with placeholder routes only — no auth, no
  business features. See `docs/architecture/` before adding a real page.
- TanStack Query provider wired at the root (`src/app.tsx`); no query is implemented yet.
- Zustand `useThemeStore` (`src/state/theme-store.ts`) for the dark-mode toggle — the one store
  justified so far per ADR-003 ("Zustand only where justified").
- `react-hook-form` and `zod` are installed per ADR-003 but not wired to a form yet — the first
  real form belongs to the Identity & Auth feature, not this milestone.
- Depends on `@tfm-bic/ui` (presentation primitives) and `@tfm-bic/contracts` (shared DTOs).

## Commands

Run from the repo root: `pnpm dev:web`, `pnpm --filter @tfm-bic/web test`, `pnpm --filter @tfm-bic/web build`.
See the [root README](../../README.md) for the full command list.
