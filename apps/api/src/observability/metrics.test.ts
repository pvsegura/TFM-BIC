import { describe, expect, it } from "vitest";

import { LATENCY_BUCKETS_MS, MetricsRegistry } from "./metrics.js";

describe("MetricsRegistry", () => {
  it("counts per label set, independent of label order", () => {
    const metrics = new MetricsRegistry();
    metrics.increment("http_responses", { route: "/a", status: "200" });
    metrics.increment("http_responses", { status: "200", route: "/a" });
    metrics.increment("http_responses", { route: "/a", status: "500" }, 3);

    expect(metrics.snapshot().counters).toEqual([
      { name: "http_responses", labels: { route: "/a", status: "200" }, value: 2 },
      { name: "http_responses", labels: { route: "/a", status: "500" }, value: 3 },
    ]);
  });

  it("aggregates durations into fixed buckets with count, sum, max and a p95 upper bound", () => {
    const metrics = new MetricsRegistry();
    for (const ms of [10, 20, 30, 40, 60, 70, 80, 90, 120, 3000]) {
      metrics.observe("http_duration_ms", { route: "/a" }, ms);
    }

    const [histogram] = metrics.snapshot().histograms;
    expect(histogram).toMatchObject({
      name: "http_duration_ms",
      labels: { route: "/a" },
      count: 10,
      sumMs: 3520,
      maxMs: 3000,
      p95UpperBoundMs: 5000,
    });
    expect(histogram?.buckets).toHaveLength(LATENCY_BUCKETS_MS.length + 1);
    expect(histogram?.buckets[0]).toEqual({ leMs: 25, count: 2 });
    expect(histogram?.buckets.at(-1)).toEqual({ leMs: "+Inf", count: 0 });
  });

  it("reports +Inf as the p95 bound when the slowest observations exceed every bucket", () => {
    const metrics = new MetricsRegistry();
    metrics.observe("d", {}, 60_000);
    expect(metrics.snapshot().histograms[0]?.p95UpperBoundMs).toBe("+Inf");
  });

  it("caps the label sets per metric: excess series collapse into one overflow series", () => {
    const metrics = new MetricsRegistry({ maxSeriesPerMetric: 2 });
    metrics.increment("c", { k: "1" });
    metrics.increment("c", { k: "2" });
    metrics.increment("c", { k: "3" });
    metrics.increment("c", { k: "4" });
    metrics.observe("h", { k: "1" }, 1);
    metrics.observe("h", { k: "2" }, 1);
    metrics.observe("h", { k: "3" }, 1);

    const snapshot = metrics.snapshot();
    expect(snapshot.counters.filter((c) => c.name === "c")).toEqual([
      { name: "c", labels: { k: "1" }, value: 1 },
      { name: "c", labels: { k: "2" }, value: 1 },
      { name: "c", labels: { overflow: "true" }, value: 2 },
    ]);
    expect(snapshot.histograms.map((h) => h.labels)).toContainEqual({ overflow: "true" });
  });

  it("ignores invalid observations instead of throwing (observability never breaks a request)", () => {
    const metrics = new MetricsRegistry();
    expect(() => {
      metrics.observe("d", {}, Number.NaN);
      metrics.observe("d", {}, -1);
      metrics.increment("c", {}, Number.POSITIVE_INFINITY);
    }).not.toThrow();
    expect(metrics.snapshot()).toEqual({ counters: [], histograms: [] });
  });
});
