import { useSearchParams } from "react-router";

/** A copy of `current` with `patch` applied: an empty value removes its key. */
function updatedSearch(current: URLSearchParams, patch: Record<string, string>): string {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(patch)) {
    if (value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }
  return next.toString();
}

/**
 * Filters kept in the URL, so a filtered page is linkable: the current search params, and a setter
 * that changes some keys (an empty string clears one) and keeps the rest.
 */
export function useSearchParamFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const setFilters = (patch: Record<string, string>) => {
    setSearchParams(updatedSearch(searchParams, patch));
  };
  return [searchParams, setFilters] as const;
}
