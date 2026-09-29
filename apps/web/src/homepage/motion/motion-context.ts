import { createContext, useContext } from "react";

/**
 * How the homepage may move, decided once by the page (docs/m20a-motion-system.md):
 * - `motion` — false under `prefers-reduced-motion`: nothing is driven, every scene is settled;
 * - `pin` — scenes that want it are pinned only with motion on a wide viewport; on small screens
 *   every scene scrolls normally (a sticky stage taller than a phone screen would hide content).
 */
export interface HomepageMotion {
  motion: boolean;
  pin: boolean;
}

/** Outside the homepage (or before it decides) nothing moves. */
export const HomepageMotionContext = createContext<HomepageMotion>({ motion: false, pin: false });

export function useHomepageMotion(): HomepageMotion {
  return useContext(HomepageMotionContext);
}

/** The viewport width from which scenes are pinned — the same breakpoint as the two-column layout. */
export const PIN_MEDIA_QUERY = "(min-width: 960px)";
