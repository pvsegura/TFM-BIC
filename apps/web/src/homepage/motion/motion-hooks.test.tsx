import { act, render, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as driverModule from "./scroll-driver.js";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion.js";
import { useSceneProgress } from "./use-scene-progress.js";

type ChangeListener = (event: MediaQueryListEvent) => void;

/** Installs a controllable `matchMedia`; jsdom has none. */
function mockReducedMotion(initiallyReduced: boolean) {
  let matches = initiallyReduced;
  const listeners = new Set<ChangeListener>();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      get matches() {
        return query === "(prefers-reduced-motion: reduce)" && matches;
      },
      media: query,
      addEventListener: (_type: string, listener: ChangeListener) => listeners.add(listener),
      removeEventListener: (_type: string, listener: ChangeListener) => listeners.delete(listener),
    })),
  );
  return {
    set(reduced: boolean) {
      matches = reduced;
      for (const listener of listeners) listener({ matches: reduced } as MediaQueryListEvent);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("usePrefersReducedMotion", () => {
  it("is true from the very first render when the user asks for reduced motion", () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it("follows the preference when it changes", () => {
    const media = mockReducedMotion(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => media.set(true));
    expect(result.current).toBe(true);
  });

  it("assumes no preference where matchMedia does not exist", () => {
    vi.stubGlobal("matchMedia", undefined);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });
});

function Scene({ enabled }: { enabled: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useSceneProgress(ref, "pinned", enabled);
  return <section ref={ref} data-testid="scene" />;
}

describe("useSceneProgress", () => {
  it("registers the scene with the page driver and unregisters it on unmount", () => {
    const unregister = vi.fn();
    const register = vi.fn(() => unregister);
    vi.spyOn(driverModule, "getPageScrollDriver").mockReturnValue({ register });

    const { getByTestId, unmount } = render(<Scene enabled />);

    expect(register).toHaveBeenCalledWith(getByTestId("scene"), "pinned");
    unmount();
    expect(unregister).toHaveBeenCalledOnce();
  });

  it("does not drive a scene when motion is disabled (reduced motion) and clears any progress", () => {
    const register = vi.fn(() => () => undefined);
    vi.spyOn(driverModule, "getPageScrollDriver").mockReturnValue({ register });

    const { getByTestId, rerender } = render(<Scene enabled />);
    getByTestId("scene").style.setProperty("--p", "0.3000");
    rerender(<Scene enabled={false} />);

    expect(register).toHaveBeenCalledTimes(1);
    expect(getByTestId("scene").style.getPropertyValue("--p")).toBe("");
  });
});
