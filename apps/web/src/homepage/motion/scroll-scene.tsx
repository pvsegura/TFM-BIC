import { useRef, type ReactNode, type RefObject } from "react";

import type { SceneKey } from "../content/homepage-content.js";
import { useHomepageMotion } from "./motion-context.js";
import { useSceneProgress } from "./use-scene-progress.js";

interface ScrollSceneProps {
  scene: SceneKey | "opening";
  /** The scene would like to pin (a sticky stage in a tall track). Honoured only when the page
   * allows pinning — with motion, on a wide viewport; otherwise the scene scrolls normally. */
  pinned?: boolean;
  /** The id of the scene's heading. Omitted only for a wrapper that holds several scenes. */
  labelledBy?: string;
  /** Whether a pinned scene wraps its content in a sticky stage (default). The opening pins a
   * figure of its own instead, beside copy that scrolls. */
  stage?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * One scene of the homepage story (docs/m20a-motion-system.md): a `<section>` named by its heading
 * (a landmark region), whose scroll progress is written to `--p` for the stylesheet. `data-mode`
 * says how that progress is measured (`pinned` or `pass-through`), and the stylesheet lays the
 * scene out to match. A wrapper holding several scenes (the opening) is a plain `<div>`, so it adds
 * no landmark.
 */
export function ScrollScene({
  scene,
  pinned = false,
  labelledBy,
  stage = true,
  className,
  children,
}: ScrollSceneProps) {
  const { motion, pin } = useHomepageMotion();
  const mode = pinned && pin ? "pinned" : "pass-through";
  const ref = useRef<HTMLElement>(null);
  useSceneProgress(ref, mode, motion);

  const classes = ["scene", `scene--${scene}`, className].filter(Boolean).join(" ");
  const body =
    mode === "pinned" && stage ? <div className="scene__stage">{children}</div> : children;

  if (labelledBy === undefined) {
    return (
      <div ref={ref as RefObject<HTMLDivElement | null>} className={classes} data-mode={mode}>
        {body}
      </div>
    );
  }

  return (
    <section
      ref={ref}
      className={classes}
      data-mode={mode}
      data-scene={scene}
      aria-labelledby={labelledBy}
    >
      {body}
    </section>
  );
}
