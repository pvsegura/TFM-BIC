# packages/ui

Shared design-system / presentation-only React components (buttons, inputs, layout primitives).
No business logic, no data fetching — pure presentation, styled with Tailwind per
[ADR-003](../../docs/adr/adr-003-frontend-stack.md).

## What's here (M1)

`Button` (`src/button/`) — the first primitive, used by `apps/web`'s header. Tailwind classes are
plain strings; there's no build step here because Tailwind v4's Vite plugin scans the whole
workspace from `apps/web`, so this package needs no Tailwind config of its own.
