import { afterEach, describe, expect, it, vi } from "vitest";

import { replacePage } from "./browser-navigation.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("replacePage", () => {
  it("replaces the current page with a full load of the path", () => {
    const replace = vi.fn();
    vi.stubGlobal("location", { replace });

    replacePage("/account-deleted");

    expect(replace).toHaveBeenCalledWith("/account-deleted");
  });
});
