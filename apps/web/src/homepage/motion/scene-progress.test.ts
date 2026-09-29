import { describe, expect, it } from "vitest";

import { sceneProgress } from "./scene-progress.js";

const VIEWPORT = 800;

describe("sceneProgress — pinned scenes (a tall track with a sticky stage)", () => {
  // A 2400px track pins its stage for 2400 − 800 = 1600px of scrolling.
  const height = 2400;

  it("is 0 until the track reaches the top of the viewport", () => {
    expect(sceneProgress({ top: 300, height }, VIEWPORT, "pinned")).toBe(0);
    expect(sceneProgress({ top: 0, height }, VIEWPORT, "pinned")).toBe(0);
  });

  it("grows linearly while the stage is pinned", () => {
    expect(sceneProgress({ top: -400, height }, VIEWPORT, "pinned")).toBeCloseTo(0.25);
    expect(sceneProgress({ top: -800, height }, VIEWPORT, "pinned")).toBeCloseTo(0.5);
  });

  it("is 1 once the stage unpins, and stays 1 after", () => {
    expect(sceneProgress({ top: -1600, height }, VIEWPORT, "pinned")).toBe(1);
    expect(sceneProgress({ top: -5000, height }, VIEWPORT, "pinned")).toBe(1);
  });

  it("treats a track no taller than the viewport as settled (nothing to pin)", () => {
    expect(sceneProgress({ top: 0, height: VIEWPORT }, VIEWPORT, "pinned")).toBe(1);
    expect(sceneProgress({ top: 0, height: 500 }, VIEWPORT, "pinned")).toBe(1);
  });
});

describe("sceneProgress — pass-through scenes (normal height)", () => {
  const height = 600;

  it("is 0 while the scene is still below the viewport", () => {
    expect(sceneProgress({ top: VIEWPORT, height }, VIEWPORT, "pass-through")).toBe(0);
    expect(sceneProgress({ top: 2000, height }, VIEWPORT, "pass-through")).toBe(0);
  });

  it("is 1 once its bottom has left the top of the viewport", () => {
    expect(sceneProgress({ top: -height, height }, VIEWPORT, "pass-through")).toBe(1);
    expect(sceneProgress({ top: -3000, height }, VIEWPORT, "pass-through")).toBe(1);
  });

  it("is halfway when the scene is centred in the viewport", () => {
    expect(sceneProgress({ top: 100, height }, VIEWPORT, "pass-through")).toBeCloseTo(0.5);
  });
});

describe("sceneProgress — defensive input", () => {
  it("returns a settled scene for a zero-height viewport or non-finite values", () => {
    expect(sceneProgress({ top: 0, height: 100 }, 0, "pass-through")).toBe(1);
    expect(sceneProgress({ top: Number.NaN, height: 100 }, VIEWPORT, "pinned")).toBe(1);
  });
});
