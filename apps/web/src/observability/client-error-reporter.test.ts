import { describe, expect, it, vi } from "vitest";

import { createClientErrorReporter, installGlobalErrorHandlers } from "./client-error-reporter.js";

function setup(options: { limit?: number; fetchImpl?: typeof fetch; path?: string } = {}) {
  const fetchImpl =
    options.fetchImpl ?? vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
  const report = createClientErrorReporter({
    fetch: fetchImpl,
    currentPath: () => options.path ?? "/learn/lessons/pl-greetings",
    ...(options.limit === undefined ? {} : { limit: options.limit }),
  });
  const sent = () =>
    vi.mocked(fetchImpl).mock.calls.map(([url, init]) => ({
      url,
      init,
      body: JSON.parse(init?.body as string) as unknown,
    }));
  return { report, fetchImpl, sent };
}

describe("createClientErrorReporter (M18)", () => {
  it("posts only the kind, the error's class name and the page path — same origin, keepalive", () => {
    const { report, sent } = setup();
    const error = new TypeError("Cannot read properties of undefined — user typed hunter2");

    report("render", error);

    const [call] = sent();
    expect(call?.url).toBe("/client-errors");
    expect(call?.init).toMatchObject({
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
    });
    expect(call?.body).toEqual({
      kind: "render",
      name: "TypeError",
      path: "/learn/lessons/pl-greetings",
    });
    expect(call?.init?.body as string).not.toContain("hunter2");
  });

  it("names a thrown non-Error value NonError and replaces an unsafe name", () => {
    const { report, sent } = setup();
    report("unhandled_rejection", "just a string");
    const weird = new Error("x");
    weird.name = "Weird name with spaces";
    report("uncaught", weird);

    expect(sent().map((c) => (c.body as { name: string }).name)).toEqual(["NonError", "Error"]);
  });

  it("never sends a path the API would refuse (query, fragment, odd characters)", () => {
    const { report, sent } = setup({ path: "/weird path\n<x>" });
    report("render", new Error("x"));
    expect((sent()[0]?.body as { path: string }).path).toBe("/");
  });

  it("sends each distinct error once and at most `limit` reports per page load", () => {
    const { report, sent } = setup({ limit: 2 });
    report("render", new TypeError("a"));
    report("render", new TypeError("a again"));
    report("uncaught", new RangeError("b"));
    report("uncaught", new SyntaxError("c"));

    expect(sent()).toHaveLength(2);
  });

  it("never throws, even when the network fails", async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new TypeError("offline")));
    const { report } = setup({ fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(() => report("render", new Error("x"))).not.toThrow();
    await Promise.resolve();

    const throwing = vi.fn(() => {
      throw new Error("fetch unavailable");
    });
    const second = setup({ fetchImpl: throwing as unknown as typeof fetch });
    expect(() => second.report("render", new Error("x"))).not.toThrow();
  });
});

describe("installGlobalErrorHandlers (M18)", () => {
  it("reports uncaught errors and unhandled rejections, and can be removed", () => {
    const target = new EventTarget();
    const report = vi.fn();
    const uninstall = installGlobalErrorHandlers(target, report);
    const error = new RangeError("r");

    target.dispatchEvent(Object.assign(new Event("error"), { error }));
    target.dispatchEvent(Object.assign(new Event("unhandledrejection"), { reason: "nope" }));

    expect(report).toHaveBeenCalledWith("uncaught", error);
    expect(report).toHaveBeenCalledWith("unhandled_rejection", "nope");

    uninstall();
    target.dispatchEvent(Object.assign(new Event("error"), { error }));
    expect(report).toHaveBeenCalledTimes(2);
  });
});
