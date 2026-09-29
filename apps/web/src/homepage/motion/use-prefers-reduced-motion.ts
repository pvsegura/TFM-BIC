import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function mediaQuery(): MediaQueryList | null {
  return typeof window.matchMedia === "function" ? window.matchMedia(QUERY) : null;
}

function subscribe(onChange: () => void): () => void {
  const query = mediaQuery();
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

const getSnapshot = () => mediaQuery()?.matches ?? false;

/**
 * Whether the user asked the operating system for reduced motion. Read synchronously on the first
 * render — so a reduced-motion visitor never sees one frame of the animated layout — and followed
 * live if the setting changes.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
