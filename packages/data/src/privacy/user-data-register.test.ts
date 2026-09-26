import { validateUserDataRegister } from "@tfm-bic/domain";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createGamificationTestDb,
  type GamificationTestDbHandle,
} from "../gamification/db/test-support/create-test-db.js";
import { NON_USER_STORES, USER_DATA_REGISTER } from "./user-data-register.js";

/**
 * The guard that keeps account deletion and the deletion matrix honest: the register must list
 * exactly the tables the migrations create, and exactly the foreign keys that point at `users`.
 * A new table — or a new column referencing a user — fails here until someone decides, in the
 * register, what happens to it when an account is deleted.
 */

let handle: GamificationTestDbHandle;

beforeAll(async () => {
  handle = await createGamificationTestDb();
});

afterAll(async () => {
  await handle.close();
});

type Row = Record<string, unknown>;

async function rows(query: ReturnType<typeof sql>): Promise<Row[]> {
  const result = (await handle.rawExecute(query)) as { rows: Row[] };
  return result.rows;
}

describe("USER_DATA_REGISTER", () => {
  it("satisfies the domain's register rules", () => {
    expect(() => {
      validateUserDataRegister(USER_DATA_REGISTER);
    }).not.toThrow();
  });

  it("lists every application table the migrations create (or names it as holding no user data)", async () => {
    const tables = await rows(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '__drizzle_migrations%'
    `);
    const actual = tables.map((row) => String(row.table_name)).sort();
    const registered = [
      ...USER_DATA_REGISTER.map((entry) => entry.store),
      ...NON_USER_STORES,
    ].sort();

    expect(actual).toEqual(registered);
  });

  it("names every foreign key to users as a user reference, and nothing else", async () => {
    const foreignKeys = await rows(sql`
      SELECT cl.relname AS table_name, att.attname AS column_name
      FROM pg_constraint con
      JOIN pg_class cl ON cl.oid = con.conrelid
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
      WHERE con.contype = 'f' AND con.confrelid = 'public.users'::regclass
    `);
    const actual = foreignKeys
      .map((row) => `${String(row.table_name)}.${String(row.column_name)}`)
      .sort();
    const registered = USER_DATA_REGISTER.filter((entry) => entry.store !== "users")
      .flatMap((entry) => entry.userReferences.map((column) => `${entry.store}.${column}`))
      .sort();

    expect(actual).toEqual(registered);
  });

  it("deletes everything on account deletion: no current store has a documented retention reason", () => {
    expect(USER_DATA_REGISTER.every((entry) => entry.erasure === "delete")).toBe(true);
  });

  it("classifies every credential store as security-sensitive", () => {
    const sensitive = USER_DATA_REGISTER.filter(
      (entry) => entry.classification === "SECURITY_SENSITIVE",
    ).map((entry) => entry.store);

    expect(sensitive.sort()).toEqual(
      ["email_verification_tokens", "password_reset_tokens", "sessions"].sort(),
    );
  });
});
