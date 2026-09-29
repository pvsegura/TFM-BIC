import { useEffect, type RefObject } from "react";

import type { SceneMode } from "./scene-progress.js";
import { getPageScrollDriver } from "./scroll-driver.js";

/**
 * Drives the `--p` custom property of a scene element from the scroll position. When `enabled` is
 * false (reduced motion) nothing is registered and any written value is removed, so the stylesheet's
 * settled state applies.
 */
export function useSceneProgress(
  ref: RefObject<HTMLElement | null>,
  mode: SceneMode,
  enabled: boolean,
): void {
  useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    if (!enabled) {
      element.style.removeProperty("--p");
      return;
    }
    return getPageScrollDriver().register(element, mode);
  }, [ref, mode, enabled]);
}
