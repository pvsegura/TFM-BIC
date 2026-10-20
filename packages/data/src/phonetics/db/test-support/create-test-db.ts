import type { SQL } from "drizzle-orm";

import { createPgliteTestDb } from "../../../db/test-support/pglite-test-db.js";
import type { IdentityDb } from "../../../identity/db/client.js";
import * as identitySchema from "../../../identity/db/schema.js";
import type { PhoneticsDb } from "../client.js";
import * as phoneticsSchema from "../schema.js";

export interface PhoneticsTestDbHandle {
  db: PhoneticsDb;
  /** The same database instance viewed as Identity's handle — lets a NODE_ENV=test composition
   * root build auth and phonetics repositories over one shared database
   * (`user_phonetic_progress` has a foreign key to `users`). */
  identityDb: IdentityDb;
  /** Inserts a real `users` row and returns its id — `user_phonetic_progress` has a foreign key to
   * `users`, so a record can only exist for a real user. */
  seedUser: (email?: string) => Promise<string>;
  /** Clears every table — cheaper between tests than booting a fresh WASM Postgres each time.
   * `CASCADE` also clears everything that references `users`. */
  reset: () => Promise<void>;
  /** Raw SQL escape hatch for setup outside the query-builder surface (e.g. deleting a user to
   * exercise `ON DELETE CASCADE`, or inserting a value the application would never write to prove
   * a CHECK constraint). Test-only. */
  rawExecute: (query: SQL) => Promise<unknown>;
  close: () => Promise<void>;
}

/**
 * A real (WASM-compiled) Postgres with Identity's and Phonetics' migrations applied in dependency
 * order — Identity first (the FK target `users` must exist), each set tracked in its own table
 * exactly as `drizzle-kit migrate` does. Same approach as the other contexts' test-support — see
 * docs/adr/adr-005-database.md. Test-only.
 */
export async function createPhoneticsTestDb(): Promise<PhoneticsTestDbHandle> {
  const base = await createPgliteTestDb({
    contexts: ["phonetics"],
    schema: { ...identitySchema, ...phoneticsSchema },
    truncate: ["user_phonetic_progress", "users"],
  });

  return {
    db: base.as<PhoneticsDb>(),
    identityDb: base.as<IdentityDb>(),
    seedUser: base.seedUser,
    reset: base.reset,
    rawExecute: base.rawExecute,
    close: base.close,
  };
}
