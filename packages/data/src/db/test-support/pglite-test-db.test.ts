import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as identitySchema from "../../identity/db/schema.js";
import * as profileSchema from "../../profile/db/schema.js";
import { createPgliteTestDb, type PgliteTestDb } from "./pglite-test-db.js";

let testDb: PgliteTestDb;

beforeAll(async () => {
  testDb = await createPgliteTestDb({
    contexts: ["profile"],
    schema: { ...identitySchema, ...profileSchema },
    truncate: ["student_profiles", "users"],
  });
});

afterAll(async () => {
  await testDb.close();
});

async function count(table: string): Promise<number> {
  const result = (await testDb.rawExecute(
    sql.raw(`SELECT count(*)::int AS n FROM "${table}"`),
  )) as {
    rows: { n: number }[];
  };
  return result.rows[0]!.n;
}

describe("createPgliteTestDb", () => {
  it("applies Identity's migrations, then each listed context's", async () => {
    expect(await count("users")).toBe(0);
    expect(await count("student_profiles")).toBe(0);
  });

  it("seeds real users, with distinct default addresses and an optional role", async () => {
    const first = await testDb.seedUser();
    const second = await testDb.seedUser();
    await testDb.seedUser("teacher@example.com", "TEACHER");

    expect(first).not.toBe(second);
    const roles = (await testDb.rawExecute(
      sql`SELECT role FROM users WHERE email = 'teacher@example.com'`,
    )) as { rows: { role: string }[] };
    expect(roles.rows[0]?.role).toBe("TEACHER");
  });

  it("empties the listed tables on reset", async () => {
    await testDb.seedUser();

    await testDb.reset();

    expect(await count("users")).toBe(0);
  });
});
