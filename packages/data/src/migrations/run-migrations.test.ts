import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it, vi } from "vitest";

import {
  MIGRATION_SETS,
  runMigrations,
  type MigrationSession,
  type MigrationSet,
} from "./run-migrations.js";

const dataRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const srcRoot = path.join(dataRoot, "src");
const log = { info: vi.fn(), warn: vi.fn() };

describe("MIGRATION_SETS (M17) — the one ordered list production applies", () => {
  it("names every migrations folder in the repository exactly once", () => {
    const onDisk = readdirSync(srcRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) => {
        try {
          return readdirSync(path.join(srcRoot, entry.name, "db", "migrations")).length > 0;
        } catch {
          return false;
        }
      })
      .map((entry) => entry.name)
      .sort();

    expect(MIGRATION_SETS.map((set) => set.context).sort()).toEqual(onDisk);
  });

  it("applies Identity first — every other set references users", () => {
    expect(MIGRATION_SETS[0]?.context).toBe("identity");
  });

  it("tracks each set in the same table its drizzle-kit config uses (databases migrated before M17 stay compatible)", () => {
    const configs = readdirSync(dataRoot).filter((name) =>
      /^drizzle(\..+)?\.config\.ts$/.test(name),
    );
    const tableByFolder = new Map<string, string>();
    for (const name of configs) {
      const source = readFileSync(path.join(dataRoot, name), "utf8");
      const folder = /out: "\.\/src\/([a-z]+)\/db\/migrations"/.exec(source)?.[1];
      const table = /table: "([^"]+)"/.exec(source)?.[1] ?? "__drizzle_migrations";
      if (folder) tableByFolder.set(folder, table);
    }

    for (const set of MIGRATION_SETS) {
      expect(set.table, set.context).toBe(tableByFolder.get(set.context));
    }
  });
});

function fakeSession(lockResults: boolean[] = [true]) {
  const calls: string[] = [];
  const session: MigrationSession = {
    tryLock: vi.fn(() => {
      calls.push("tryLock");
      return Promise.resolve(lockResults.shift() ?? false);
    }),
    unlock: vi.fn(() => {
      calls.push("unlock");
      return Promise.resolve();
    }),
    apply: vi.fn((set: MigrationSet) => {
      calls.push(`apply:${set.context}`);
      return Promise.resolve();
    }),
  };
  return { session, calls };
}

describe("runMigrations (M17)", () => {
  it("takes the migration lock, applies every set in order, then releases the lock", async () => {
    const { session, calls } = fakeSession();

    await runMigrations(session, { log, sleep: () => Promise.resolve() });

    expect(calls).toEqual([
      "tryLock",
      ...MIGRATION_SETS.map((set) => `apply:${set.context}`),
      "unlock",
    ]);
  });

  it("stops at the first failing set and still releases the lock", async () => {
    const { session, calls } = fakeSession();
    vi.mocked(session.apply).mockImplementation((set) => {
      calls.push(`apply:${set.context}`);
      return set.context === "profile"
        ? Promise.reject(new Error("syntax error"))
        : Promise.resolve();
    });

    await expect(runMigrations(session, { log, sleep: () => Promise.resolve() })).rejects.toThrow(
      /profile/,
    );
    expect(calls).toEqual(["tryLock", "apply:identity", "apply:profile", "unlock"]);
  });

  it("waits a bounded time for a concurrent run, then fails without applying anything", async () => {
    const { session, calls } = fakeSession([false, false, false]);
    const sleep = vi.fn(() => Promise.resolve());

    await expect(
      runMigrations(session, { log, sleep, lockAttempts: 3, lockRetryDelayMs: 10 }),
    ).rejects.toThrow(/another migration/i);
    expect(calls).toEqual(["tryLock", "tryLock", "tryLock"]);
    expect(session.apply).not.toHaveBeenCalled();
    expect(session.unlock).not.toHaveBeenCalled();
  });

  it("proceeds once a concurrent run has released the lock", async () => {
    const { session } = fakeSession([false, true]);

    await runMigrations(session, { log, sleep: () => Promise.resolve() });

    expect(session.apply).toHaveBeenCalledTimes(MIGRATION_SETS.length);
  });
});

describe("every migration set on a clean database (real Postgres via PGlite)", () => {
  function pgliteSession(client: PGlite): MigrationSession {
    const db = drizzle(client);
    return {
      tryLock: () => Promise.resolve(true),
      unlock: () => Promise.resolve(),
      apply: (set) =>
        migrate(db, {
          migrationsFolder: path.join(srcRoot, set.folder),
          migrationsTable: set.table,
        }),
    };
  }

  it("applies all sets in order, and a second run changes nothing", async () => {
    const client = new PGlite();
    try {
      const session = pgliteSession(client);
      await runMigrations(session, { log, sleep: () => Promise.resolve() });
      const tables = async () =>
        (
          await client.query<{ table_name: string }>(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1",
          )
        ).rows.map((row) => row.table_name);
      const afterFirst = await tables();

      await runMigrations(session, { log, sleep: () => Promise.resolve() });

      expect(afterFirst).toEqual(
        expect.arrayContaining([
          "users",
          "sessions",
          "teacher_students",
          "newsletter_subscriptions",
        ]),
      );
      expect(await tables()).toEqual(afterFirst);
    } finally {
      await client.close();
    }
  }, 60_000);
});
