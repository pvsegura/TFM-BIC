# packages/testing

Shared test utilities, fixtures, and factories used across `packages/*` and `apps/*` test suites,
to keep test setup (e.g., building a fake Student entity) DRY without becoming a hidden source of
untested logic itself.

## What's here (M1)

`renderWithProviders()` (`src/render/`) — React Testing Library's `render`, pre-wrapped with the
same provider tree `apps/web` mounts (currently just `QueryClientProvider`). Used by `apps/web`'s
component tests.
