import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as identitySchema from "../../identity/db/schema.js";
import * as schema from "./schema.js";

/**
 * The type the newsletter repository is written against — see identity/db/client.ts for why the
 * PGlite test driver is cast to it. Includes `users`, which the repository joins for the current
 * email address.
 */
export type NewsletterDb = NodePgDatabase<typeof schema & typeof identitySchema>;

export interface NewsletterDbHandle {
  db: NewsletterDb;
  close: () => Promise<void>;
}

/** Same `DATABASE_URL` and database as every other context; a small pool of its own. */
export function createNewsletterDb(databaseUrl: string): NewsletterDbHandle {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema: { ...schema, ...identitySchema } });
  return { db, close: () => pool.end() };
}
