import { describe, expect, it, vi } from "vitest";

import { createShutdownHandler, waitForDatabase } from "./process-lifecycle.js";

const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

describe("waitForDatabase (M17: start-up with bounded retries)", () => {
  it("returns true as soon as the database answers, without sleeping", async () => {
    const sleep = vi.fn(() => Promise.resolve());

    await expect(
      waitForDatabase(() => Promise.resolve(true), {
        attempts: 5,
        initialDelayMs: 100,
        sleep,
        log,
      }),
    ).resolves.toBe(true);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("retries with exponential backoff capped at maxDelayMs, then succeeds", async () => {
    const answers = [false, false, false, true];
    const sleep = vi.fn((_ms: number) => Promise.resolve());

    const ready = await waitForDatabase(() => Promise.resolve(answers.shift() ?? false), {
      attempts: 5,
      initialDelayMs: 500,
      maxDelayMs: 1500,
      sleep,
      log,
    });

    expect(ready).toBe(true);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([500, 1000, 1500]);
  });

  it("gives up after the last attempt — never an infinite loop", async () => {
    const isReady = vi.fn(() => Promise.resolve(false));
    const sleep = vi.fn(() => Promise.resolve());

    await expect(
      waitForDatabase(isReady, { attempts: 4, initialDelayMs: 10, sleep, log }),
    ).resolves.toBe(false);
    expect(isReady).toHaveBeenCalledTimes(4);
    expect(sleep).toHaveBeenCalledTimes(3);
  });

  it("logs why each attempt failed when a reason is available (a safe code, e.g. 28P01)", async () => {
    const warn = vi.fn();

    await waitForDatabase(() => Promise.resolve(false), {
      attempts: 2,
      initialDelayMs: 1,
      sleep: () => Promise.resolve(),
      log: { ...log, warn },
      failureReason: () => "28P01",
    });

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ attempt: 1, reason: "28P01" }),
      "database.unreachable_at_startup",
    );
  });

  it("treats a throwing check as not ready", async () => {
    await expect(
      waitForDatabase(() => Promise.reject(new Error("boom")), {
        attempts: 2,
        initialDelayMs: 1,
        sleep: () => Promise.resolve(),
        log,
      }),
    ).resolves.toBe(false);
  });
});

describe("createShutdownHandler (M17: graceful, bounded)", () => {
  function setup(
    overrides: { closeServer?: () => Promise<void>; closers?: (() => Promise<void>)[] } = {},
  ) {
    const exit = vi.fn();
    const order: string[] = [];
    const closeServer =
      overrides.closeServer ??
      vi.fn(() => {
        order.push("server");
        return Promise.resolve();
      });
    const closers = overrides.closers ?? [
      vi.fn(() => {
        order.push("db");
        return Promise.resolve();
      }),
    ];
    const shutdown = createShutdownHandler({ closeServer, closers, timeoutMs: 1000, exit, log });
    return { shutdown, exit, order, closeServer, closers };
  }

  it("stops accepting requests first, then releases resources, then exits 0", async () => {
    const { shutdown, exit, order } = setup();

    await shutdown("SIGTERM");

    expect(order).toEqual(["server", "db"]);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("exits 1 when shutting down because start-up failed, even if every close succeeds", async () => {
    const { shutdown, exit } = setup();

    await shutdown("startup-failure", { failed: true });

    expect(exit).toHaveBeenCalledWith(1);
  });

  it("runs once even if several signals arrive", async () => {
    const { shutdown, closeServer, exit } = setup();

    await Promise.all([shutdown("SIGTERM"), shutdown("SIGINT"), shutdown("SIGTERM")]);

    expect(closeServer).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it("exits 1 when closing fails, after still trying every closer", async () => {
    const db = vi.fn(() => Promise.resolve());
    const { shutdown, exit } = setup({
      closers: [() => Promise.reject(new Error("pool end failed")), db],
    });

    await shutdown("SIGTERM");

    expect(db).toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("forces exit 1 when shutdown hangs past the timeout — a container never hangs forever", async () => {
    vi.useFakeTimers();
    try {
      const { shutdown, exit } = setup({ closeServer: () => new Promise<void>(() => undefined) });

      void shutdown("SIGTERM");
      await vi.advanceTimersByTimeAsync(999);
      expect(exit).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);

      expect(exit).toHaveBeenCalledWith(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
