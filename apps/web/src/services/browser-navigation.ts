/**
 * A full page load of `path` on this origin, replacing the current history entry. Used where
 * in-app navigation is not enough: after account deletion, every in-memory trace of the user
 * (query cache, component state) must go, and no in-app redirect racing it may win.
 */
export function replacePage(path: string): void {
  window.location.replace(path);
}
