import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createGamificationTestDb,
  type GamificationTestDbHandle,
} from "../gamification/db/test-support/create-test-db.js";
import { DrizzleAccountErasureStore } from "./account-erasure.store.js";
import { seedEveryUserTable } from "./test-support/seed-user-data.js";
import { USER_DATA_REGISTER } from "./user-data-register.js";

let handle: GamificationTestDbHandle;
let store: DrizzleAccountErasureStore;

beforeAll(async () => {
  handle = await createGamificationTestDb();
  store = new DrizzleAccountErasureStore(handle.identityDb);
});

afterAll(async () => {
  await handle.close();
});

beforeEach(async () => {
  await handle.reset();
});

/** Rows about `userId` in every registered store, keyed by store. */
async function rowCounts(userId: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const entry of USER_DATA_REGISTER) {
    const columns = entry.store === "users" ? ["id"] : entry.userReferences;
    const where = sql.join(
      columns.map((column) => sql`${sql.identifier(column)} = ${userId}::uuid`),
      sql` OR `,
    );
    const result = (await handle.rawExecute(
      sql`SELECT count(*)::int AS n FROM ${sql.identifier(entry.store)} WHERE ${where}`,
    )) as { rows: { n: number }[] };
    counts[entry.store] = Number(result.rows[0]?.n ?? 0);
  }
  return counts;
}

describe("DrizzleAccountErasureStore", () => {
  it("erases the account and its rows in every registered store", async () => {
    const teacher = await handle.seedUser("teacher@example.com", "TEACHER");
    const student = await handle.seedUser("student@example.com");
    await seedEveryUserTable(handle, student, { teacherId: teacher });

    const before = await rowCounts(student);
    expect(Object.values(before).every((n) => n >= 1)).toBe(true);

    await expect(store.eraseAccount(student)).resolves.toBe(true);

    const after = await rowCounts(student);
    expect(Object.values(after).every((n) => n === 0)).toBe(true);
  });

  it("leaves every other user's rows untouched", async () => {
    const teacher = await handle.seedUser("teacher@example.com", "TEACHER");
    const ana = await handle.seedUser("ana@example.com");
    const ben = await handle.seedUser("ben@example.com");
    await seedEveryUserTable(handle, ana, { teacherId: teacher, tag: "ana" });
    await seedEveryUserTable(handle, ben, { teacherId: teacher, tag: "ben" });
    const benBefore = await rowCounts(ben);
    const teacherBefore = await rowCounts(teacher);

    await store.eraseAccount(ana);

    expect(await rowCounts(ben)).toEqual(benBefore);
    // The teacher keeps their account; only the link to the erased student is gone.
    expect(await rowCounts(teacher)).toEqual({ ...teacherBefore, teacher_students: 1 });
  });

  it("erasing a teacher removes their links but never their students' data", async () => {
    const teacher = await handle.seedUser("teacher@example.com", "TEACHER");
    const student = await handle.seedUser("student@example.com");
    await seedEveryUserTable(handle, student, { teacherId: teacher });
    const studentBefore = await rowCounts(student);

    await store.eraseAccount(teacher);

    expect(await rowCounts(student)).toEqual({ ...studentBefore, teacher_students: 0 });
    expect((await rowCounts(teacher)).users).toBe(0);
  });

  it("is idempotent: an account that is already gone resolves false and changes nothing", async () => {
    const ana = await handle.seedUser("ana@example.com");
    await store.eraseAccount(ana);

    await expect(store.eraseAccount(ana)).resolves.toBe(false);
    await expect(store.eraseAccount("99999999-9999-4999-8999-999999999999")).resolves.toBe(false);
  });

  it("is all-or-nothing: if the final delete fails, every earlier delete is rolled back", async () => {
    const ana = await handle.seedUser("ana@example.com");
    await seedEveryUserTable(handle, ana);
    const before = await rowCounts(ana);
    await handle.rawExecute(sql`
      CREATE FUNCTION refuse_user_delete() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'simulated failure'; END; $$ LANGUAGE plpgsql`);
    await handle.rawExecute(sql`
      CREATE TRIGGER refuse_user_delete BEFORE DELETE ON users
      FOR EACH ROW EXECUTE FUNCTION refuse_user_delete()`);

    try {
      await expect(store.eraseAccount(ana)).rejects.toThrow();
      expect(await rowCounts(ana)).toEqual(before);
    } finally {
      await handle.rawExecute(sql`DROP TRIGGER refuse_user_delete ON users`);
      await handle.rawExecute(sql`DROP FUNCTION refuse_user_delete()`);
    }
  });

  it("never touches the database for a malformed id", async () => {
    await expect(store.eraseAccount("not-a-uuid")).resolves.toBe(false);
  });

  it("refuses to start with a register that retains or anonymises anything (not implemented until decided)", () => {
    expect(
      () =>
        new DrizzleAccountErasureStore(handle.identityDb, [
          ...USER_DATA_REGISTER.filter((entry) => entry.store !== "exercise_attempts"),
          {
            store: "exercise_attempts",
            context: "exercises",
            userReferences: ["user_id"],
            classification: "PERSONAL",
            erasure: "retain",
            reason: "hypothetical legal hold",
          },
        ]),
    ).toThrow(/exercise_attempts/);
  });

  it("refuses to start with an invalid register", () => {
    expect(() => new DrizzleAccountErasureStore(handle.identityDb, [])).toThrow(/empty/);
  });
});
