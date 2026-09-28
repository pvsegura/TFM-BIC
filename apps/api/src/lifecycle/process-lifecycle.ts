/**
 * Process start-up and shutdown (M17). Kept out of index.ts (the untested composition root) so the
 * bounded-retry and bounded-shutdown rules are unit-tested.
 */

interface LifecycleLog {
  info: (obj: object, msg: string) => void;
  warn: (obj: object, msg: string) => void;
  error: (obj: object, msg: string) => void;
}

export interface WaitForDatabaseOptions {
  /** Total checks, including the first. Always finite. */
  attempts: number;
  initialDelayMs: number;
  /** Upper bound for one wait; the delay doubles up to it. Defaults to 10 s. */
  maxDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  log: LifecycleLog;
  /** Why the last check failed — a safe code only (e.g. `28P01`, `ENOTFOUND`, `timeout`). */
  failureReason?: () => string | undefined;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Checks the database until it answers or the attempts run out — for start-up, where a managed
 * database may still be waking up (serverless Postgres suspends when idle). Bounded exponential
 * backoff; never retries forever. Returns whether the database became reachable; the caller exits
 * when it did not, so an orchestrator restarts the process instead of it serving errors.
 */
export async function waitForDatabase(
  isReady: () => Promise<boolean>,
  options: WaitForDatabaseOptions,
): Promise<boolean> {
  const { attempts, initialDelayMs, maxDelayMs = 10_000, sleep = defaultSleep, log } = options;
  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (await isReady().catch(() => false)) {
      return true;
    }
    if (attempt === attempts) {
      break;
    }
    log.warn(
      { attempt, attempts, retryInMs: delay, reason: options.failureReason?.() },
      "database.unreachable_at_startup",
    );
    await sleep(delay);
    delay = Math.min(delay * 2, maxDelayMs);
  }
  return false;
}

export interface ShutdownOptions {
  /** Stops accepting connections and waits for in-flight requests (Fastify's `close()`). */
  closeServer: () => Promise<void>;
  /** Resources released after the server has stopped (database pools…). */
  closers: readonly (() => Promise<void>)[];
  /** Hard limit for the whole shutdown; past it the process exits 1 anyway. */
  timeoutMs: number;
  exit: (code: number) => void;
  log: LifecycleLog;
}

/**
 * The SIGTERM/SIGINT handler. Idempotent (a second signal does not start a second shutdown), and
 * bounded: a stuck request or pool cannot keep a container alive past `timeoutMs` — keep it below
 * the platform's own kill grace period.
 */
export function createShutdownHandler(
  options: ShutdownOptions,
): (signal: string, context?: { failed?: boolean }) => Promise<void> {
  const { closeServer, closers, timeoutMs, exit, log } = options;
  let running: Promise<void> | undefined;

  /** `alreadyFailed`: shutting down because something went wrong (e.g. start-up) — exit 1. */
  async function run(signal: string, alreadyFailed: boolean): Promise<void> {
    log.info({ signal, timeoutMs }, "shutdown.started");
    const timer = setTimeout(() => {
      log.error({ signal, timeoutMs }, "shutdown.timed_out");
      exit(1);
    }, timeoutMs);
    timer.unref?.();

    let failed = alreadyFailed;
    try {
      await closeServer();
    } catch (error) {
      failed = true;
      log.error({ err: error }, "shutdown.server_close_failed");
    }
    const results = await Promise.allSettled(closers.map((close) => close()));
    for (const result of results) {
      if (result.status === "rejected") {
        failed = true;
        log.error({ err: result.reason as unknown }, "shutdown.resource_close_failed");
      }
    }

    clearTimeout(timer);
    log.info({ signal, failed }, "shutdown.completed");
    exit(failed ? 1 : 0);
  }

  return (signal, context) => {
    running ??= run(signal, context?.failed === true);
    return running;
  };
}
