/**
 * How a homepage scene turns scroll position into progress (M20A, docs/m20a-motion-system.md).
 *
 * - `pinned`: the scene is a tall track whose stage sticks to the viewport; progress runs while the
 *   stage is stuck — 0 when the track reaches the top of the viewport, 1 when the stage unpins.
 * - `pass-through`: a normal-height scene; progress runs from its top entering at the bottom of the
 *   viewport (0) to its bottom leaving at the top (1).
 */
export type SceneMode = "pinned" | "pass-through";

export interface SceneRect {
  /** Distance from the viewport's top edge to the element's top edge (negative once scrolled past). */
  top: number;
  height: number;
}

/** Anything that cannot be measured is shown in its settled, final state — never half-drawn. */
const SETTLED = 1;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function sceneProgress(rect: SceneRect, viewportHeight: number, mode: SceneMode): number {
  if (!Number.isFinite(rect.top) || !Number.isFinite(rect.height) || viewportHeight <= 0) {
    return SETTLED;
  }

  if (mode === "pinned") {
    const pinnedDistance = rect.height - viewportHeight;
    return pinnedDistance <= 0 ? SETTLED : clamp01(-rect.top / pinnedDistance);
  }

  return clamp01((viewportHeight - rect.top) / (viewportHeight + rect.height));
}
