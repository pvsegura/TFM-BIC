import type { SQL } from "drizzle-orm";

import { createPgliteTestDb } from "../../../db/test-support/pglite-test-db.js";
import type { IdentityDb } from "../client.js";
import * as schema from "../schema.js";

export interface TestDbHandle {
  db: IdentityDb;
  /** Clears every Identity table — much faster between tests than booting
   * a fresh WASM Postgres each time, while still giving each test a clean
   * slate. `RESTART IDENTITY CASCADE` also handles the FK-dependent
   * tables (sessions/tokens reference users). */
  reset: () => Promise<void>;
  /** Raw SQL escape hatch for test setup that needs something outside the
   * `IdentityDb` query-builder surface (e.g. deleting a row to exercise an
   * FK `ON DELETE CASCADE`). Test-only — repositories never use this. */
  rawExecute: (query: SQL) => Promise<unknown>;
  close: () => Promise<void>;
}

/**
 * A real (WASM-compiled) Postgres instance, with M3's migrations already
 * applied — see docs/adr/adr-005-database.md for why this replaces a
 * hand-rolled repository fake for M3's repository tests. Not exported from
 * the package's public index; test-only.
 */
export async function createTestDb(): Promise<TestDbHandle> {
  const base = await createPgliteTestDb({
    contexts: [],
    schema,
    truncate: ["users", "sessions", "email_verification_tokens", "password_reset_tokens"],
  });

  return {
    db: base.as<IdentityDb>(),
    reset: base.reset,
    rawExecute: base.rawExecute,
    close: base.close,
  };
}
