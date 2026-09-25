/**
 * What a teacher may ask of their student list. Every value is a closed set or a bound: the
 * contracts build their validation from these, and the read model maps each sort field to a fixed
 * SQL expression — a client-supplied column name never reaches a query.
 */

export const ROSTER_SORT_FIELDS = [
  "name",
  "lastActivity",
  "points",
  "lessonsCompleted",
  "accuracy",
] as const;
export type RosterSortField = (typeof ROSTER_SORT_FIELDS)[number];

export const ROSTER_SORT_DIRECTIONS = ["asc", "desc"] as const;
export type RosterSortDirection = (typeof ROSTER_SORT_DIRECTIONS)[number];

/** `active`/`inactive` as defined by `isActiveStudent` (teacher-dashboard-metrics.ts). */
export const ROSTER_ACTIVITY_FILTERS = ["active", "inactive"] as const;
export type RosterActivityFilter = (typeof ROSTER_ACTIVITY_FILTERS)[number];

export const DEFAULT_ROSTER_PAGE_SIZE = 20;
export const MAX_ROSTER_PAGE_SIZE = 50;
/** A generous ceiling that still stops absurd offsets (50 × 1000 = 50 000 students). */
export const MAX_ROSTER_PAGE = 1000;
export const MAX_ROSTER_SEARCH_LENGTH = 50;

/** Names read naturally A→Z; every measure reads best highest / most recent first. */
export function defaultDirectionFor(field: RosterSortField): RosterSortDirection {
  return field === "name" ? "asc" : "desc";
}
