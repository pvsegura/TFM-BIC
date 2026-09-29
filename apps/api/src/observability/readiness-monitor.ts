import type { MetricsRegistry } from "./metrics.js";

export interface ReadinessState {
  ready: boolean | null;
  /** A safe code (SQLSTATE, Node error code, `timeout`) — never a message or host. */
  lastFailureReason: string | null;
  /** When the current state began. */
  since: string | null;
}

export interface ReadinessMonitor {
  isReady: () => Promise<boolean>;
  state: () => ReadinessState;
}

/**
 * Wraps the readiness check behind GET /ready (M18). Probes run every few seconds, so only a
 * change is logged: `readiness.lost` (warn, with the reason code) and `readiness.restored`. Every
 * check is counted. A throwing check means "not ready", as before.
 */
export function createReadinessMonitor(options: {
  check: () => Promise<boolean>;
  failureReason: () => string | undefined;
  log: { info(details: object, msg: string): void; warn(details: object, msg: string): void };
  metrics: MetricsRegistry;
  now?: () => Date;
}): ReadinessMonitor {
  const now = options.now ?? (() => new Date());
  let state: ReadinessState = { ready: null, lastFailureReason: null, since: null };

  return {
    async isReady() {
      const ready = await options.check().catch(() => false);
      options.metrics.increment("readiness_checks_total", {
        outcome: ready ? "ready" : "not_ready",
      });
      const reason = ready ? null : (options.failureReason() ?? "unknown");
      if (ready !== state.ready) {
        if (!ready) {
          options.log.warn({ reason }, "readiness.lost");
        } else if (state.ready === false) {
          options.log.info({}, "readiness.restored");
        }
        state = { ready, lastFailureReason: reason, since: now().toISOString() };
      } else if (!ready) {
        state = { ...state, lastFailureReason: reason };
      }
      return ready;
    },
    state: () => state,
  };
}
