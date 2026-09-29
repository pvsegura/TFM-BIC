import { useCallback, useSyncExternalStore } from "react";

function mediaQuery(query: string): MediaQueryList | null {
  return typeof window.matchMedia === "function" ? window.matchMedia(query) : null;
}

/**
 * Whether a media query matches — read synchronously on the first render (so the first frame is
 * already right) and followed live. False where `matchMedia` does not exist.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = mediaQuery(query);
      list?.addEventListener("change", onChange);
      return () => list?.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => mediaQuery(query)?.matches ?? false, [query]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Whether the user asked the operating system for reduced motion. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
