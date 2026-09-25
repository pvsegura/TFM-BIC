import { ApiError } from "../services/api-error.js";
import { formatDate, formatNumber } from "./reward-labels.js";

/**
 * Words for the teacher pages. Every number shown is the API's; these only format them. `null`
 * always means "no data" and is said in words — never shown as 0 or 0%.
 */

export const UNNAMED_STUDENT = "Unnamed student";

export function studentName(displayName: string | null): string {
  return displayName ?? UNNAMED_STUDENT;
}

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${String(value)}%`;
}

export function formatLastActivity(iso: string | null): string {
  return iso === null ? "No activity yet" : formatDate(iso);
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`;
}

export const FORBIDDEN_MESSAGE = "Your account does not have access to the teacher dashboard.";

/** A refused (403) request says so; anything else is a retryable load failure. */
export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

/** A week's Monday, shown in UTC — the API buckets weeks in UTC, so a local zone would shift it. */
export function formatWeek(iso: string): string {
  return new Date(iso).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** A language/level pair as a compact label, e.g. `PL · A1`. */
export function levelLabel(languageId: string, levelId: string): string {
  return `${languageId.toUpperCase()} · ${levelId.toUpperCase()}`;
}
