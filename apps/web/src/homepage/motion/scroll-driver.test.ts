import { describe, expect, it, vi } from "vitest";

import { createScrollDriver, type DriverEnvironment } from "./scroll-driver.js";

/** A window stand-in whose animation frames run only when the test flushes them. */
function fakeEnvironment(innerHeight = 800) {
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 1;
  const listeners = new Map<string, EventListener>();

  const env: DriverEnvironment = {
    get innerHeight() {
      return innerHeight;
    },
    requestAnimationFrame: (callback) => {
      const id = nextFrame++;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame: (id) => {
      frames.delete(id);
    },
    addEventListener: (type: string, listener: EventListener) => {
      listeners.set(type, listener);
    },
    removeEventListener: (type: string) => {
      listeners.delete(type);
    },
  };

  return {
    env,
    listeners,
    pendingFrames: () => frames.size,
    flush() {
      const callbacks = [...frames.values()];
      frames.clear();
      for (const callback of callbacks) callback(0);
    },
    fire(type: string) {
      listeners.get(type)?.(new Event(type));
    },
  };
}

function sceneAt(top: number, height: number) {
  const element = document.createElement("section");
  const rect = { top, height };
  vi.spyOn(element, "getBoundingClientRect").mockImplementation(
    () => ({ top: rect.top, height: rect.height }) as DOMRect,
  );
  return { element, rect };
}

const progressOf = (element: HTMLElement) => element.style.getPropertyValue("--p");

describe("createScrollDriver", () => {
  it("writes each registered scene's progress as the --p custom property on the next frame", () => {
    const fake = fakeEnvironment();
    const driver = createScrollDriver(fake.env);
    const pinned = sceneAt(-800, 2400);
    const passing = sceneAt(100, 600);

    driver.register(pinned.element, "pinned");
    driver.register(passing.element, "pass-through");
    expect(progressOf(pinned.element)).toBe("");

    fake.flush();

    expect(progressOf(pinned.element)).toBe("0.5000");
    expect(progressOf(passing.element)).toBe("0.5000");
  });

  it("updates on scroll, batching many scroll events into one frame", () => {
    const fake = fakeEnvironment();
    const driver = createScrollDriver(fake.env);
    const scene = sceneAt(0, 2400);
    driver.register(scene.element, "pinned");
    fake.flush();
    expect(progressOf(scene.element)).toBe("0.0000");

    scene.rect.top = -1600;
    fake.fire("scroll");
    fake.fire("scroll");
    fake.fire("scroll");
    expect(fake.pendingFrames()).toBe(1);

    fake.flush();
    expect(progressOf(scene.element)).toBe("1.0000");
  });

  it("also updates on resize", () => {
    const fake = fakeEnvironment();
    const driver = createScrollDriver(fake.env);
    const scene = sceneAt(-400, 2400);
    driver.register(scene.element, "pinned");
    fake.flush();

    scene.rect.top = -800;
    fake.fire("resize");
    fake.flush();

    expect(progressOf(scene.element)).toBe("0.5000");
  });

  it("listens only while at least one scene is registered", () => {
    const fake = fakeEnvironment();
    const driver = createScrollDriver(fake.env);
    expect(fake.listeners.size).toBe(0);

    const first = driver.register(sceneAt(0, 1000).element, "pinned");
    const second = driver.register(sceneAt(0, 1000).element, "pinned");
    expect([...fake.listeners.keys()].sort()).toEqual(["resize", "scroll"]);

    first();
    expect(fake.listeners.size).toBe(2);
    second();
    expect(fake.listeners.size).toBe(0);
    expect(fake.pendingFrames()).toBe(0);
  });

  it("stops measuring a scene once it is unregistered", () => {
    const fake = fakeEnvironment();
    const driver = createScrollDriver(fake.env);
    const scene = sceneAt(0, 2400);
    const unregister = driver.register(scene.element, "pinned");
    fake.flush();

    unregister();
    scene.rect.top = -1600;
    fake.fire("scroll");
    fake.flush();

    expect(progressOf(scene.element)).toBe("0.0000");
  });

  it("with an IntersectionObserver, measures only scenes near the viewport", () => {
    let observerCallback: IntersectionObserverCallback = () => undefined;
    const observed = new Set<Element>();
    class FakeObserver {
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
      }
      observe(element: Element) {
        observed.add(element);
      }
      unobserve(element: Element) {
        observed.delete(element);
      }
      disconnect() {
        observed.clear();
      }
    }
    const fake = fakeEnvironment();
    const driver = createScrollDriver({
      ...fake.env,
      innerHeight: 800,
      IntersectionObserver: FakeObserver as unknown as typeof IntersectionObserver,
    });
    const near = sceneAt(-800, 2400);
    const far = sceneAt(5000, 2400);
    driver.register(near.element, "pinned");
    driver.register(far.element, "pinned");
    expect(observed.size).toBe(2);

    observerCallback(
      [
        { target: near.element, isIntersecting: true },
        { target: far.element, isIntersecting: false },
      ] as unknown as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    );
    fake.flush();

    expect(progressOf(near.element)).toBe("0.5000");
    expect(progressOf(far.element)).toBe("");
  });
});
