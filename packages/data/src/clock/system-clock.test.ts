import { describe, expect, it } from "vitest";

import { SystemClock } from "./system-clock.js";

describe("SystemClock", () => {
  it("returns a Date close to the real current time", () => {
    const before = Date.now();
    const result = new SystemClock().now();
    const after = Date.now();

    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after);
  });
});
