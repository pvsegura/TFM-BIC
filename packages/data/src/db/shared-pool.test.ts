import { describe, expect, it, vi } from "vitest";

import {
  POSTGRES_POOL_OPTIONS,
  createSharedPoolRegistry,
  pingDatabase,
  type PoolLike,
} from "./shared-pool.js";

function fakePool(overrides: Partial<PoolLike> = {}): PoolLike & { end: ReturnType<typeof vi.fn> } {
  return {
    query: vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] }),
    end: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as PoolLike & { end: ReturnType<typeof vi.fn> };
}

describe("createSharedPoolRegistry (M17)", () => {
  it("hands every context the same pool for one DATABASE_URL — one bounded pool, not one per context", () => {
    const factory = vi.fn(() => fakePool());
    const registry = createSharedPoolRegistry(factory);

    const a = registry.acquire("postgres://db/app");
    const b = registry.acquire("postgres://db/app");

    expect(a.pool).toBe(b.pool);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("creates the pool with bounded size and connection/idle/statement timeouts", () => {
    const factory = vi.fn(() => fakePool());
    createSharedPoolRegistry(factory).acquire("postgres://db/app");

    expect(factory).toHaveBeenCalledWith({
      connectionString: "postgres://db/app",
      ...POSTGRES_POOL_OPTIONS,
    });
    expect(POSTGRES_POOL_OPTIONS.max).toBeGreaterThan(0);
    expect(POSTGRES_POOL_OPTIONS.connectionTimeoutMillis).toBeGreaterThan(0);
    expect(POSTGRES_POOL_OPTIONS.idleTimeoutMillis).toBeGreaterThan(0);
    expect(POSTGRES_POOL_OPTIONS.statement_timeout).toBeGreaterThan(0);
  });

  it("ends the pool once, after the last holder releases it", async () => {
    const pool = fakePool();
    const registry = createSharedPoolRegistry(() => pool);
    const a = registry.acquire("postgres://db/app");
    const b = registry.acquire("postgres://db/app");

    await a.release();
    expect(pool.end).not.toHaveBeenCalled();
    await b.release();
    await b.release(); // releasing twice is harmless
    expect(pool.end).toHaveBeenCalledTimes(1);
  });

  it("creates a fresh pool after the previous one was ended", async () => {
    const factory = vi.fn(() => fakePool());
    const registry = createSharedPoolRegistry(factory);
    await registry.acquire("postgres://db/app").release();

    registry.acquire("postgres://db/app");

    expect(factory).toHaveBeenCalledTimes(2);
  });
});

describe("pingDatabase (M17)", () => {
  it("is true when SELECT 1 succeeds", async () => {
    const pool = fakePool();
    await expect(pingDatabase(pool, 1000)).resolves.toBe(true);
    expect(pool.query).toHaveBeenCalledWith("SELECT 1");
  });

  it("is false (never throws) when the query fails", async () => {
    const pool = fakePool({ query: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) });
    await expect(pingDatabase(pool, 1000)).resolves.toBe(false);
  });

  it("is false when the database does not answer within the timeout", async () => {
    vi.useFakeTimers();
    try {
      const pool = fakePool({ query: vi.fn(() => new Promise<never>(() => undefined)) });
      const result = pingDatabase(pool, 500);
      await vi.advanceTimersByTimeAsync(500);
      await expect(result).resolves.toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
