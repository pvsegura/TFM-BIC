import { describe, expect, it, vi } from "vitest";

import { MetricsRegistry } from "./metrics.js";
import { createReadinessMonitor } from "./readiness-monitor.js";

function monitor(results: (boolean | Error)[], reason = "ECONNREFUSED") {
  const log = { info: vi.fn(), warn: vi.fn() };
  const metrics = new MetricsRegistry();
  const check = vi.fn(() => {
    const next = results.shift();
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next ?? true);
  });
  const readiness = createReadinessMonitor({
    check,
    failureReason: () => reason,
    log,
    metrics,
    now: () => new Date("2026-09-29T10:00:00.000Z"),
  });
  return { readiness, log, metrics };
}

describe("createReadinessMonitor (M18)", () => {
  it("logs only transitions: lost (with the safe reason code), then restored", async () => {
    const { readiness, log } = monitor([true, false, false, true, true]);

    for (let i = 0; i < 5; i++) {
      await readiness.isReady();
    }

    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenCalledWith({ reason: "ECONNREFUSED" }, "readiness.lost");
    expect(log.info).toHaveBeenCalledTimes(1);
    expect(log.info).toHaveBeenCalledWith({}, "readiness.restored");
  });

  it("treats a throwing check as not ready and counts every check by outcome", async () => {
    const { readiness, metrics, log } = monitor([new Error("boom")]);

    await expect(readiness.isReady()).resolves.toBe(false);

    expect(log.warn).toHaveBeenCalledWith({ reason: "ECONNREFUSED" }, "readiness.lost");
    expect(metrics.snapshot().counters).toEqual([
      { name: "readiness_checks_total", labels: { outcome: "not_ready" }, value: 1 },
    ]);
  });

  it("exposes the current state for the metrics endpoint", async () => {
    const { readiness } = monitor([false]);
    expect(readiness.state()).toEqual({ ready: null, lastFailureReason: null, since: null });

    await readiness.isReady();

    expect(readiness.state()).toEqual({
      ready: false,
      lastFailureReason: "ECONNREFUSED",
      since: "2026-09-29T10:00:00.000Z",
    });
  });
});
