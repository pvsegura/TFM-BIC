import { sceneProgress, type SceneMode } from "./scene-progress.js";

/**
 * The one scroll loop behind every homepage scene (M20A, docs/m20a-motion-system.md).
 *
 * One passive `scroll` + `resize` listener for the whole page, at most one animation frame per
 * frame, and inside that frame every rect is **read first, then** every `--p` is written — so
 * layout is computed once, never interleaved with style writes. When an IntersectionObserver is
 * available only scenes near the viewport are measured; a scene that leaves gets one last update so
 * it never stays half-drawn after a fast scroll.
 *
 * `--p` is written through the CSSOM (`style.setProperty`), which the SPA's `style-src 'self'`
 * Content-Security-Policy allows.
 */
export interface DriverEnvironment {
  readonly innerHeight: number;
  requestAnimationFrame(callback: FrameRequestCallback): number;
  cancelAnimationFrame(handle: number): void;
  addEventListener(type: string, listener: EventListener, options?: AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListener): void;
  readonly IntersectionObserver?: typeof IntersectionObserver;
}

export interface ScrollDriver {
  /** Starts driving `--p` on the element; returns the function that stops it. */
  register(element: HTMLElement, mode: SceneMode): () => void;
}

/** Scenes this far outside the viewport are already measured, so they are settled on arrival. */
const OBSERVER_MARGIN = "50% 0px";

export function createScrollDriver(env: DriverEnvironment): ScrollDriver {
  const scenes = new Map<HTMLElement, SceneMode>();
  /** Scenes to measure on the next frame; every scene when there is no observer. */
  const nearViewport = new Set<HTMLElement>();
  const leaving = new Set<HTMLElement>();
  let frame: number | null = null;
  let observer: IntersectionObserver | null = null;

  function update() {
    frame = null;
    const viewportHeight = env.innerHeight;
    const targets = [...nearViewport, ...leaving];
    const measured = targets.map((element) => {
      const { top, height } = element.getBoundingClientRect();
      return { element, top, height };
    });
    for (const { element, top, height } of measured) {
      const mode = scenes.get(element);
      if (mode === undefined) continue;
      const progress = sceneProgress({ top, height }, viewportHeight, mode);
      element.style.setProperty("--p", progress.toFixed(4));
    }
    leaving.clear();
  }

  function schedule() {
    frame ??= env.requestAnimationFrame(update);
  }

  function start() {
    env.addEventListener("scroll", schedule, { passive: true });
    env.addEventListener("resize", schedule, { passive: true });
    if (env.IntersectionObserver !== undefined) {
      observer = new env.IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const element = entry.target as HTMLElement;
            if (entry.isIntersecting) {
              nearViewport.add(element);
            } else if (nearViewport.delete(element)) {
              leaving.add(element);
            }
          }
          schedule();
        },
        { rootMargin: OBSERVER_MARGIN },
      );
    }
  }

  function stop() {
    env.removeEventListener("scroll", schedule);
    env.removeEventListener("resize", schedule);
    observer?.disconnect();
    observer = null;
    if (frame !== null) env.cancelAnimationFrame(frame);
    frame = null;
  }

  return {
    register(element, mode) {
      if (scenes.size === 0) start();
      scenes.set(element, mode);
      if (observer === null) {
        nearViewport.add(element);
      } else {
        observer.observe(element);
      }
      schedule();

      return () => {
        scenes.delete(element);
        nearViewport.delete(element);
        leaving.delete(element);
        observer?.unobserve(element);
        if (scenes.size === 0) stop();
      };
    },
  };
}

let pageDriver: ScrollDriver | null = null;

/** The page's single driver, created on first use (never at import time, so tests and SSR-less
 * environments without a window are unaffected). */
export function getPageScrollDriver(): ScrollDriver {
  pageDriver ??= createScrollDriver(window);
  return pageDriver;
}
