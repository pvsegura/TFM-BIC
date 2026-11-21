import { loadEnv } from "@verbysia/config";
import { createDatabaseReadinessCheck, type DatabaseReadinessCheck } from "@verbysia/data";

import {
  connectionClosers,
  createAppDependencies,
  type AppDependencies,
} from "./composition/app-dependencies.js";
import { createTestDependencies } from "./composition/test-dependencies.js";
import {
  createShutdownHandler,
  registerFatalErrorHandlers,
  waitForDatabase,
} from "./lifecycle/process-lifecycle.js";
import { buildServer } from "./server.js";

/** Below Docker's default 10 s stop grace period, so we exit on our own terms (M17). */
const SHUTDOWN_TIMEOUT_MS = 8_000;
/** Start-up checks: 1+2+4+8+10 s ≈ 25 s of waiting, enough for a suspended serverless database. */
const STARTUP_DATABASE_ATTEMPTS = 6;
const STARTUP_DATABASE_INITIAL_DELAY_MS = 1_000;

const startedAt = performance.now();

const env = loadEnv();

// NODE_ENV=test: an in-process PGlite instance instead of a live Postgres
// connection (see docs/adr/adr-005-database.md) — lets E2E tests run the
// real server/HTTP stack with no Docker/network database. loadEnv() does
// not require DATABASE_URL in this case. Every other environment requires
// a real DATABASE_URL and fails fast without one (defensive re-check below
// — the primary guard is loadEnv() itself).
let deps: AppDependencies;
let readiness: DatabaseReadinessCheck | undefined;
if (env.NODE_ENV === "test") {
  deps = await createTestDependencies(env);
} else {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required outside of NODE_ENV=test.");
  }
  deps = await createAppDependencies(env, env.DATABASE_URL);
  readiness = createDatabaseReadinessCheck(env.DATABASE_URL);
}

const app = buildServer(
  env,
  deps,
  readiness
    ? { isReady: readiness.isReady, readinessFailureReason: readiness.lastFailureReason }
    : {},
);

// SIGTERM (orchestrator stop) / SIGINT (Ctrl+C): stop accepting requests (Fastify answers 503
// while closing), let in-flight ones finish, release the shared pool, exit — within a hard limit.
const shutdown = createShutdownHandler({
  closeServer: () => app.close(),
  closers: [...connectionClosers(deps), ...(readiness ? [readiness.close] : [])],
  timeoutMs: SHUTDOWN_TIMEOUT_MS,
  exit: (code) => process.exit(code),
  log: app.log,
});
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
registerFatalErrorHandlers(process, { log: app.log, shutdown });

async function start(): Promise<void> {
  // Configuration was validated by loadEnv() above; now the database must answer before the port
  // opens — a process that cannot reach it exits instead of serving errors (M17).
  if (readiness) {
    const reachable = await waitForDatabase(readiness.isReady, {
      attempts: STARTUP_DATABASE_ATTEMPTS,
      initialDelayMs: STARTUP_DATABASE_INITIAL_DELAY_MS,
      log: app.log,
      failureReason: readiness.lastFailureReason,
    });
    if (!reachable) {
      app.log.error(
        { attempts: STARTUP_DATABASE_ATTEMPTS, reason: readiness.lastFailureReason() },
        "database.unreachable_giving_up",
      );
      await shutdown("startup-failure", { failed: true });
      return;
    }
  }
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(
      {
        nodeEnv: env.NODE_ENV,
        version: env.APP_VERSION,
        startupMs: Math.round(performance.now() - startedAt),
      },
      "server.started",
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
