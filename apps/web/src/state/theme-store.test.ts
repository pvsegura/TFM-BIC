import { beforeEach, describe, expect, it } from "vitest";

import { useThemeStore } from "./theme-store.js";

describe("useThemeStore", () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: "light" });
    localStorage.clear();
  });

  it("defaults to light", () => {
    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("toggles from light to dark and back", () => {
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe("dark");

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("persists the current theme to localStorage", () => {
    useThemeStore.getState().toggleTheme();

    const stored = JSON.parse(localStorage.getItem("tfm-bic-theme") ?? "{}") as {
      state?: { theme?: string };
    };
    expect(stored.state?.theme).toBe("dark");
  });
});
