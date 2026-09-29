import { Pool, type PoolConfig } from "pg";

/**
 * Connection settings for the one Postgres pool the API process uses (M17). Before M17 every
 * context opened its own pool with `pg`'s defaults — up to 10 connections each (≈110 in total)
 * and no timeouts at all, so an unreachable database made requests hang instead of failing.
 *
 * - `max`: the whole process's connection budget. Managed Postgres plans cap connections; keep
 *   (instances × max) plus the migration/operator connections under that cap.
 * - `connectionTimeoutMillis`: how long a request waits for a connection before failing.
 * - `idleTimeoutMillis`: idle connections are closed, so a quiet instance holds none.
 * - `statement_timeout`: server-side cap on any single statement — no query of this app is
 *   expected to take more than a fraction of it.
 */
export const POSTGRES_POOL_OPTIONS = {
  max: 10,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: 15_000,
} as const;

/** The part of `pg.Pool` this module uses — narrow so tests can substitute it. */
export interface PoolLike {
  query: (text: string) => Promise<unknown>;
  end: () => Promise<void>;
  on: (event: "error", listener: (error: Error) => void) => unknown;
  /** `pg.Pool`'s live counters (M18). */
  readonly totalCount?: number;
  readonly idleCount?: number;
  readonly waitingCount?: number;
}

/** Connection usage for GET /internal/metrics (M18) — counts only, never a connection string. */
export interface SharedPoolStats {
  pools: number;
  maxConnectionsPerPool: number;
  totalConnections: number;
  idleConnections: number;
  /** Queries waiting for a free connection: sustained > 0 means the pool is exhausted. */
  waitingRequests: number;
  /** Idle connections the server dropped since start-up (restart, failover, network). */
  idleConnectionErrors: number;
}

export interface SharedPoolLease<P extends PoolLike> {
  pool: P;
  /** Gives the lease back; the pool is ended when the last lease is released. Idempotent. */
  release: () => Promise<void>;
}

export interface SharedPoolRegistry<P extends PoolLike> {
  acquire(databaseUrl: string): SharedPoolLease<P>;
  stats(): SharedPoolStats;
}

/**
 * One pool per connection string, reference-counted: every context's `create*Db(databaseUrl)`
 * acquires the same pool and releases it on `close()`, and the pool is ended exactly once.
 */
export function createSharedPoolRegistry<P extends PoolLike>(
  createPool: (config: PoolConfig) => P,
  onIdleError: (details: { code: string | undefined }) => void = logIdleClientError,
): SharedPoolRegistry<P> {
  const entries = new Map<string, { pool: P; holders: number }>();
  let idleConnectionErrors = 0;

  return {
    stats() {
      const pools = [...entries.values()].map((entry) => entry.pool);
      const sum = (read: (pool: P) => number | undefined) =>
        pools.reduce((total, pool) => total + (read(pool) ?? 0), 0);
      return {
        pools: pools.length,
        maxConnectionsPerPool: POSTGRES_POOL_OPTIONS.max,
        totalConnections: sum((pool) => pool.totalCount),
        idleConnections: sum((pool) => pool.idleCount),
        waitingRequests: sum((pool) => pool.waitingCount),
        idleConnectionErrors,
      };
    },
    acquire(databaseUrl) {
      let entry = entries.get(databaseUrl);
      if (!entry) {
        const pool = createPool({ connectionString: databaseUrl, ...POSTGRES_POOL_OPTIONS });
        // An idle connection the server drops (restart, failover, admin termination — 57P01) is
        // emitted as an "error" event; unhandled, it would crash the process. pg discards that
        // client itself; the next query opens a new connection (found by the M17 outage test).
        pool.on("error", (error) => {
          idleConnectionErrors += 1;
          onIdleError({ code: (error as Error & { code?: string }).code });
        });
        entry = { pool, holders: 0 };
        entries.set(databaseUrl, entry);
      }
      entry.holders += 1;
      const held = entry;
      let released = false;

      return {
        pool: held.pool,
        release: async () => {
          if (released) {
            return;
          }
          released = true;
          held.holders -= 1;
          if (held.holders === 0) {
            entries.delete(databaseUrl);
            await held.pool.end();
          }
        },
      };
    },
  };
}

/** One structured line on stderr — only the SQLSTATE code, never the message or connection details. */
function logIdleClientError(details: { code: string | undefined }): void {
  process.stderr.write(
    `${JSON.stringify({ level: "warn", time: new Date().toISOString(), msg: "database.idle_connection_lost", ...details })}
`,
  );
}

/** The process-wide registry of real `pg` pools. */
export const sharedPostgresPools = createSharedPoolRegistry((config) => new Pool(config));

/** A SQLSTATE (`28P01`) or Node/OpenSSL error code (`ENOTFOUND`, `SELF_SIGNED_CERT_IN_CHAIN`). */
const SAFE_ERROR_CODE = /^[A-Z0-9_]{2,48}$/;

/**
 * Runs `SELECT 1` within `timeoutMs`. Resolves `undefined` when the database answered, otherwise a
 * reason safe to log: the error's code, `"timeout"` or `"unknown"` — never the error message, the
 * host or the connection string (M17: a deployment could not reach Neon and the logs said nothing).
 * Never throws.
 */
export async function probeDatabase(
  pool: PoolLike,
  timeoutMs: number,
): Promise<string | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<string>((resolve) => {
    timer = setTimeout(() => resolve("timeout"), timeoutMs);
  });
  const query = pool.query("SELECT 1").then(
    () => undefined,
    (error: unknown) => {
      const code = (error as { code?: unknown } | undefined)?.code;
      return typeof code === "string" && SAFE_ERROR_CODE.test(code) ? code : "unknown";
    },
  );
  try {
    return await Promise.race([query, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * True when the database answers `SELECT 1` within `timeoutMs`. Never throws and never logs: the
 * caller (readiness, start-up) decides what an unreachable database means.
 */
export async function pingDatabase(pool: PoolLike, timeoutMs: number): Promise<boolean> {
  return (await probeDatabase(pool, timeoutMs)) === undefined;
}

export interface DatabaseReadinessCheck {
  /** True when the database can serve queries right now. */
  isReady: () => Promise<boolean>;
  /** Why the last failed check failed (a safe code, see `probeDatabase`); undefined after a success. */
  lastFailureReason: () => string | undefined;
  close: () => Promise<void>;
}

/** A readiness check over the shared pool for `databaseUrl` (M17, used by GET /ready). */
export function createDatabaseReadinessCheck(
  databaseUrl: string,
  timeoutMs = 2_000,
): DatabaseReadinessCheck {
  const { pool, release } = sharedPostgresPools.acquire(databaseUrl);
  let lastFailure: string | undefined;
  return {
    isReady: async () => {
      lastFailure = await probeDatabase(pool, timeoutMs);
      return lastFailure === undefined;
    },
    lastFailureReason: () => lastFailure,
    close: release,
  };
}
