import type { SQL } from "drizzle-orm";

import { createPgliteTestDb } from "../../../db/test-support/pglite-test-db.js";
import type { IdentityDb } from "../../../identity/db/client.js";
import * as identitySchema from "../../../identity/db/schema.js";
import type { ProfileDb } from "../client.js";
import * as profileSchema from "../schema.js";

export interface ProfileTestDbHandle {
  db: ProfileDb;
  /** The same database instance viewed as Identity's handle — lets a
   * NODE_ENV=test composition root build auth and profile repositories over
   * one shared database (the `users` FK requires it). */
  identityDb: IdentityDb;
  /** Inserts a real `users` row and returns its id — `student_profiles` has
   * a foreign key to `users`, so a profile can only exist for a real user. */
  seedUser: (email?: string) => Promise<string>;
  /** Clears every table — cheaper between tests than booting a fresh WASM
   * Postgres each time. `CASCADE` also clears everything that references
   * `users`. */
  reset: () => Promise<void>;
  /** Raw SQL escape hatch for setup outside the query-builder surface (e.g.
   * deleting a user to exercise `ON DELETE CASCADE`, or inserting a value the
   * application would never write to prove a CHECK constraint). Test-only. */
  rawExecute: (query: SQL) => Promise<unknown>;
  close: () => Promise<void>;
}

/**
 * A real (WASM-compiled) Postgres with Identity's migrations applied first
 * (the FK target `users` must exist) and then Student Profile's, each set
 * tracked in its own table exactly as `drizzle-kit migrate` does. Same
 * approach as identity/db/test-support/create-test-db.ts — see
 * docs/adr/adr-005-database.md. Test-only.
 */
export async function createProfileTestDb(): Promise<ProfileTestDbHandle> {
  const base = await createPgliteTestDb({
    contexts: ["profile"],
    schema: { ...identitySchema, ...profileSchema },
    truncate: ["student_profiles", "users"],
  });

  return {
    db: base.as<ProfileDb>(),
    identityDb: base.as<IdentityDb>(),
    seedUser: base.seedUser,
    reset: base.reset,
    rawExecute: base.rawExecute,
    close: base.close,
  };
}
