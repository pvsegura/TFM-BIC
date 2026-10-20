import type { SQL } from "drizzle-orm";

import { createPgliteTestDb } from "../../../db/test-support/pglite-test-db.js";
import type { IdentityDb } from "../../../identity/db/client.js";
import * as identitySchema from "../../../identity/db/schema.js";
import type { VideoDb } from "../client.js";
import * as videoSchema from "../schema.js";

export interface VideoTestDbHandle {
  db: VideoDb;
  /** The same database instance viewed as Identity's handle — lets a NODE_ENV=test composition
   * root build auth and video repositories over one shared database (`video_generation_jobs` has
   * a foreign key to `users`). */
  identityDb: IdentityDb;
  /** Inserts a real `users` row and returns its id — `video_generation_jobs` has a foreign key to
   * `users`, so a job can only exist for a real user. */
  seedUser: (email?: string) => Promise<string>;
  /** Clears every table — cheaper between tests than booting a fresh WASM Postgres each time.
   * `CASCADE` also clears everything that references `users`. */
  reset: () => Promise<void>;
  /** Raw SQL escape hatch for setup outside the query-builder surface (e.g. inserting a value the
   * application would never write to prove a CHECK constraint). Test-only. */
  rawExecute: (query: SQL) => Promise<unknown>;
  close: () => Promise<void>;
}

/**
 * A real (WASM-compiled) Postgres with Identity's and Video's migrations applied in dependency
 * order — Identity first (the FK target `users` must exist), each set tracked in its own table
 * exactly as `drizzle-kit migrate` does. Same approach as the other contexts' test-support — see
 * docs/adr/adr-005-database.md. Test-only.
 */
export async function createVideoTestDb(): Promise<VideoTestDbHandle> {
  const base = await createPgliteTestDb({
    contexts: ["video"],
    schema: { ...identitySchema, ...videoSchema },
    truncate: ["video_generation_jobs", "users"],
  });

  return {
    db: base.as<VideoDb>(),
    identityDb: base.as<IdentityDb>(),
    seedUser: base.seedUser,
    reset: base.reset,
    rawExecute: base.rawExecute,
    close: base.close,
  };
}
