/**
 * In-process metrics (M18, ADR-029): counters and fixed-bucket latency histograms, kept in memory
 * and read on demand by GET /internal/metrics. No push, no timer, no network call. Values reset
 * when the process restarts — the durable record is the log stream.
 *
 * Labels must be controlled values (route templates, status codes, provider names, error
 * categories) — never ids, emails, IPs, URLs or messages. As a safety net, each metric keeps at
 * most `maxSeriesPerMetric` label sets; further ones collapse into `{ overflow: "true" }`.
 */

export type Labels = Readonly<Record<string, string>>;

/** Upper bounds (ms). Chosen around the API's observed latencies (M17: 10–30 ms) up to the
 * provider timeouts (seconds). */
export const LATENCY_BUCKETS_MS = [25, 50, 100, 250, 500, 1000, 2500, 5000, 10000] as const;

const OVERFLOW: Labels = { overflow: "true" };

export interface CounterSnapshot {
  name: string;
  labels: Labels;
  value: number;
}

export interface HistogramSnapshot {
  name: string;
  labels: Labels;
  count: number;
  sumMs: number;
  maxMs: number;
  /** The upper bound of the bucket holding the 95th percentile — an estimate, not an exact value. */
  p95UpperBoundMs: number | "+Inf";
  /** Per-bucket (not cumulative) counts; the last bucket is everything above the largest bound. */
  buckets: { leMs: number | "+Inf"; count: number }[];
}

export interface MetricsSnapshot {
  counters: CounterSnapshot[];
  histograms: HistogramSnapshot[];
}

interface Histogram {
  count: number;
  sum: number;
  max: number;
  buckets: number[];
}

interface Series<T> {
  labels: Labels;
  value: T;
}

function seriesKey(labels: Labels): string {
  return JSON.stringify(Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)));
}

function sortedLabels(labels: Labels): Labels {
  return Object.fromEntries(Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)));
}

export class MetricsRegistry {
  private readonly counters = new Map<string, Map<string, Series<number>>>();
  private readonly histograms = new Map<string, Map<string, Series<Histogram>>>();
  private readonly maxSeriesPerMetric: number;

  constructor(options: { maxSeriesPerMetric?: number } = {}) {
    this.maxSeriesPerMetric = options.maxSeriesPerMetric ?? 200;
  }

  increment(name: string, labels: Labels, by = 1): void {
    if (!Number.isFinite(by) || by < 0) {
      return;
    }
    const series = this.series(this.counters, name, labels, () => 0);
    series.value += by;
  }

  observe(name: string, labels: Labels, durationMs: number): void {
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      return;
    }
    const { value } = this.series(this.histograms, name, labels, () => ({
      count: 0,
      sum: 0,
      max: 0,
      buckets: Array.from({ length: LATENCY_BUCKETS_MS.length + 1 }, () => 0),
    }));
    const index = LATENCY_BUCKETS_MS.findIndex((bound) => durationMs <= bound);
    value.buckets[index === -1 ? LATENCY_BUCKETS_MS.length : index]! += 1;
    value.count += 1;
    value.sum += durationMs;
    value.max = Math.max(value.max, durationMs);
  }

  snapshot(): MetricsSnapshot {
    const counters: CounterSnapshot[] = [];
    for (const [name, byLabels] of this.counters) {
      for (const { labels, value } of byLabels.values()) {
        counters.push({ name, labels, value });
      }
    }
    const histograms: HistogramSnapshot[] = [];
    for (const [name, byLabels] of this.histograms) {
      for (const { labels, value } of byLabels.values()) {
        histograms.push({
          name,
          labels,
          count: value.count,
          sumMs: Math.round(value.sum),
          maxMs: Math.round(value.max),
          p95UpperBoundMs: p95UpperBound(value),
          buckets: value.buckets.map((count, i) => ({
            leMs: LATENCY_BUCKETS_MS[i] ?? "+Inf",
            count,
          })),
        });
      }
    }
    return { counters, histograms };
  }

  private series<T>(
    store: Map<string, Map<string, Series<T>>>,
    name: string,
    labels: Labels,
    initial: () => T,
  ): Series<T> {
    let byLabels = store.get(name);
    if (!byLabels) {
      byLabels = new Map();
      store.set(name, byLabels);
    }
    let key = seriesKey(labels);
    let existing = byLabels.get(key);
    if (!existing) {
      let effective = sortedLabels(labels);
      if (byLabels.size >= this.maxSeriesPerMetric) {
        effective = OVERFLOW;
        key = seriesKey(OVERFLOW);
        existing = byLabels.get(key);
      }
      if (!existing) {
        existing = { labels: effective, value: initial() };
        byLabels.set(key, existing);
      }
    }
    return existing;
  }
}

function p95UpperBound(histogram: Histogram): number | "+Inf" {
  const rank = Math.ceil(histogram.count * 0.95);
  let seen = 0;
  for (const [i, count] of histogram.buckets.entries()) {
    seen += count;
    if (seen >= rank) {
      return LATENCY_BUCKETS_MS[i] ?? "+Inf";
    }
  }
  return "+Inf";
}
