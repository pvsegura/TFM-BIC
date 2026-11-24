import { createPgliteTestDb, type PgliteTestDb } from "../../../db/test-support/pglite-test-db.js";
import * as identitySchema from "../../../identity/db/schema.js";
import * as commerceSchema from "../../../commerce/db/schema.js";
import * as memorySchema from "../schema.js";

/**
 * A real (WASM) Postgres with Identity's, Commerce's and Memory's migrations applied — the
 * memory trainer reads licences, so a composition root under test builds both over one database.
 * Test-only.
 */
export function createVerbysiaTestDb(): Promise<PgliteTestDb> {
  return createPgliteTestDb({
    contexts: ["commerce", "memory"],
    schema: { ...identitySchema, ...commerceSchema, ...memorySchema },
    truncate: [
      "memory_reviews",
      "memory_cards",
      "payment_events",
      "payment_customers",
      "licences",
      "purchases",
      "subscriptions",
      "admin_audit_log",
      "users",
    ],
  });
}
