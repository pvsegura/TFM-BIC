/**
 * Port for reading the current time. Use cases depend on this interface,
 * never on `Date.now()`/`new Date()` directly, so they stay testable without
 * real I/O — see docs/architecture/architecture-overview.md and
 * .claude/skills/project-architecture.
 */
export interface Clock {
  now(): Date;
}
