import { MAX_NICKNAME_LENGTH, MAX_PROFILE_NAME_LENGTH, MIN_NICKNAME_LENGTH } from "@tfm-bic/domain";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createProfileTestDb, type ProfileTestDbHandle } from "./db/test-support/create-test-db.js";
import { DrizzleProfileRepository } from "./profile.repository.js";

let handle: ProfileTestDbHandle;
let repository: DrizzleProfileRepository;

beforeAll(async () => {
  handle = await createProfileTestDb();
  repository = new DrizzleProfileRepository(handle.db);
});

afterEach(async () => {
  await handle.reset();
});

afterAll(async () => {
  await handle.close();
});

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

function messagesOf(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  while (current instanceof Error) {
    parts.push(current.message);
    current = current.cause;
  }
  return parts.join(" | ");
}

/** Asserts the promise rejects and that the database (not just the
 * application) named the given constraint. */
async function expectConstraintViolation(promise: Promise<unknown>, constraint: string) {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught, "expected the statement to be rejected").toBeDefined();
  expect(messagesOf(caught)).toContain(constraint);
}

async function countProfiles(): Promise<number> {
  const result = (await handle.rawExecute(
    sql`SELECT count(*)::int AS n FROM student_profiles`,
  )) as {
    rows: { n: number }[];
  };
  return result.rows[0]?.n ?? -1;
}

describe("DrizzleProfileRepository", () => {
  describe("findByUserId", () => {
    it("returns null when the user has no profile yet", async () => {
      const userId = await handle.seedUser();

      expect(await repository.findByUserId(userId)).toBeNull();
    });

    it("returns null for a user id that does not exist", async () => {
      expect(await repository.findByUserId(NIL_UUID)).toBeNull();
    });

    it("returns only the requested user's profile", async () => {
      const first = await handle.seedUser();
      const second = await handle.seedUser();
      await repository.upsert(first, { firstName: "Ana" });
      await repository.upsert(second, { firstName: "Bea" });

      expect((await repository.findByUserId(first))?.firstName).toBe("Ana");
      expect((await repository.findByUserId(second))?.firstName).toBe("Bea");
    });

    it("returns exactly the StudentProfile fields — nothing extra", async () => {
      const userId = await handle.seedUser();
      await repository.upsert(userId, { firstName: "Ana" });

      const profile = await repository.findByUserId(userId);

      expect(Object.keys(profile ?? {}).sort()).toEqual(
        [
          "avatarId",
          "createdAt",
          "firstName",
          "lastName",
          "nickname",
          "updatedAt",
          "userId",
        ].sort(),
      );
    });
  });

  describe("upsert", () => {
    it("creates the profile on first save, leaving unset fields null", async () => {
      const userId = await handle.seedUser();

      const profile = await repository.upsert(userId, { firstName: "Ana" });

      expect(profile).toMatchObject({
        userId,
        firstName: "Ana",
        lastName: null,
        nickname: null,
        avatarId: null,
      });
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.updatedAt).toBeInstanceOf(Date);
    });

    it("persists what it returns", async () => {
      const userId = await handle.seedUser();

      const saved = await repository.upsert(userId, {
        firstName: "Ana",
        lastName: "García",
        nickname: "anita",
        avatarId: "avatar-03",
      });

      expect(await repository.findByUserId(userId)).toEqual(saved);
    });

    it("updates only the provided fields and preserves the rest", async () => {
      const userId = await handle.seedUser();
      await repository.upsert(userId, {
        firstName: "Ana",
        lastName: "García",
        nickname: "anita",
        avatarId: "avatar-03",
      });

      const updated = await repository.upsert(userId, { nickname: "ani" });

      expect(updated).toMatchObject({
        firstName: "Ana",
        lastName: "García",
        nickname: "ani",
        avatarId: "avatar-03",
      });
    });

    it("clears a text field when it is explicitly null, preserving the rest", async () => {
      const userId = await handle.seedUser();
      await repository.upsert(userId, {
        firstName: "Ana",
        lastName: "García",
        nickname: "anita",
        avatarId: "avatar-03",
      });

      const updated = await repository.upsert(userId, { firstName: null, nickname: null });

      expect(updated).toMatchObject({
        firstName: null,
        lastName: "García",
        nickname: null,
        avatarId: "avatar-03",
      });
    });

    it("keeps createdAt and advances updatedAt on an update", async () => {
      const userId = await handle.seedUser();
      const created = await repository.upsert(userId, { firstName: "Ana" });
      await new Promise((resolve) => setTimeout(resolve, 15));

      const updated = await repository.upsert(userId, { firstName: "Anna" });

      expect(updated.createdAt).toEqual(created.createdAt);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });

    it("creates an empty profile from an empty patch and leaves an existing one unchanged", async () => {
      const userId = await handle.seedUser();

      const empty = await repository.upsert(userId, {});
      expect(empty).toMatchObject({ firstName: null, lastName: null, nickname: null });

      await repository.upsert(userId, { firstName: "Ana" });
      const unchanged = await repository.upsert(userId, {});
      expect(unchanged.firstName).toBe("Ana");
    });

    it("keeps exactly one row per user however many times it is saved", async () => {
      const userId = await handle.seedUser();

      await repository.upsert(userId, { firstName: "A" });
      await repository.upsert(userId, { lastName: "B" });
      await repository.upsert(userId, { nickname: "cc" });

      expect(await countProfiles()).toBe(1);
    });

    it("never touches another user's profile", async () => {
      const first = await handle.seedUser();
      const second = await handle.seedUser();
      await repository.upsert(second, { firstName: "Other", nickname: "other" });

      await repository.upsert(first, { firstName: "Ana" });

      expect(await repository.findByUserId(second)).toMatchObject({
        firstName: "Other",
        nickname: "other",
      });
    });

    it("survives two concurrent first-time saves without a conflict, merging both", async () => {
      const userId = await handle.seedUser();

      await Promise.all([
        repository.upsert(userId, { firstName: "Ana" }),
        repository.upsert(userId, { lastName: "García" }),
      ]);

      expect(await countProfiles()).toBe(1);
      expect(await repository.findByUserId(userId)).toMatchObject({
        firstName: "Ana",
        lastName: "García",
      });
    });

    it("round-trips Unicode text exactly", async () => {
      const userId = await handle.seedUser();

      const saved = await repository.upsert(userId, {
        firstName: "Łukasz",
        lastName: "Dvořák-Nguyễn",
        nickname: "李小龙🦊",
      });

      expect(saved).toMatchObject({
        firstName: "Łukasz",
        lastName: "Dvořák-Nguyễn",
        nickname: "李小龙🦊",
      });
    });

    it("stores HTML- and SQL-looking text as inert data (parameterized queries)", async () => {
      const userId = await handle.seedUser();
      const xss = "<script>alert(1)</script>";
      const injection = "Robert'); DROP TABLE users;--";

      await repository.upsert(userId, { firstName: xss, lastName: injection });

      expect(await repository.findByUserId(userId)).toMatchObject({
        firstName: xss,
        lastName: injection,
      });
      expect(await handle.rawExecute(sql`SELECT 1 FROM users LIMIT 1`)).toBeDefined();
    });

    it("rejects a profile for a user that does not exist (foreign key)", async () => {
      await expectConstraintViolation(
        repository.upsert(NIL_UUID, { firstName: "Ghost" }),
        "student_profiles_user_id_users_id_fk",
      );
      expect(await countProfiles()).toBe(0);
    });
  });

  describe("user relationship", () => {
    it("deletes the profile when its user is deleted — no orphaned data", async () => {
      const userId = await handle.seedUser();
      await repository.upsert(userId, { firstName: "Ana" });
      expect(await countProfiles()).toBe(1);

      await handle.rawExecute(sql`DELETE FROM users WHERE id = ${userId}`);

      expect(await countProfiles()).toBe(0);
      expect(await repository.findByUserId(userId)).toBeNull();
    });

    it("leaves other users' profiles when one user is deleted", async () => {
      const first = await handle.seedUser();
      const second = await handle.seedUser();
      await repository.upsert(first, { firstName: "Ana" });
      await repository.upsert(second, { firstName: "Bea" });

      await handle.rawExecute(sql`DELETE FROM users WHERE id = ${first}`);

      expect((await repository.findByUserId(second))?.firstName).toBe("Bea");
    });
  });

  describe("avatar handling", () => {
    it("maps a stored avatar id that is no longer in the catalog to null", async () => {
      const userId = await handle.seedUser();
      await handle.rawExecute(
        sql`INSERT INTO student_profiles (user_id, avatar_id) VALUES (${userId}, 'avatar-retired')`,
      );

      expect((await repository.findByUserId(userId))?.avatarId).toBeNull();
    });
  });

  describe("database CHECK constraints (defense in depth below the application)", () => {
    async function insertFirstName(value: string) {
      const userId = await handle.seedUser();
      return handle.rawExecute(
        sql`INSERT INTO student_profiles (user_id, first_name) VALUES (${userId}, ${value})`,
      );
    }
    async function insertNickname(value: string) {
      const userId = await handle.seedUser();
      return handle.rawExecute(
        sql`INSERT INTO student_profiles (user_id, nickname) VALUES (${userId}, ${value})`,
      );
    }

    it("accepts a name of exactly the maximum length", async () => {
      await expect(insertFirstName("a".repeat(MAX_PROFILE_NAME_LENGTH))).resolves.toBeDefined();
    });

    it("rejects a name longer than the domain maximum", async () => {
      await expectConstraintViolation(
        insertFirstName("a".repeat(MAX_PROFILE_NAME_LENGTH + 1)),
        "student_profiles_first_name_valid",
      );
    });

    it("rejects an empty name", async () => {
      await expectConstraintViolation(insertFirstName(""), "student_profiles_first_name_valid");
    });

    it("rejects a whitespace-only name", async () => {
      await expectConstraintViolation(insertFirstName("   "), "student_profiles_first_name_valid");
    });

    it("rejects a name with surrounding spaces", async () => {
      await expectConstraintViolation(
        insertFirstName(" Ana "),
        "student_profiles_first_name_valid",
      );
    });

    it("applies the same rules to the last name", async () => {
      const userId = await handle.seedUser();
      await expectConstraintViolation(
        handle.rawExecute(
          sql`INSERT INTO student_profiles (user_id, last_name) VALUES (${userId}, ${"   "})`,
        ),
        "student_profiles_last_name_valid",
      );
    });

    it("accepts a nickname at exactly the minimum and maximum lengths", async () => {
      await expect(insertNickname("a".repeat(MIN_NICKNAME_LENGTH))).resolves.toBeDefined();
      await expect(insertNickname("a".repeat(MAX_NICKNAME_LENGTH))).resolves.toBeDefined();
    });

    it("rejects a nickname shorter than the minimum", async () => {
      await expectConstraintViolation(
        insertNickname("a".repeat(MIN_NICKNAME_LENGTH - 1)),
        "student_profiles_nickname_valid",
      );
    });

    it("rejects a nickname longer than the maximum", async () => {
      await expectConstraintViolation(
        insertNickname("a".repeat(MAX_NICKNAME_LENGTH + 1)),
        "student_profiles_nickname_valid",
      );
    });

    it("rejects a whitespace-only nickname", async () => {
      await expectConstraintViolation(insertNickname("     "), "student_profiles_nickname_valid");
    });

    it("accepts an all-null profile", async () => {
      const userId = await handle.seedUser();
      await expect(
        handle.rawExecute(sql`INSERT INTO student_profiles (user_id) VALUES (${userId})`),
      ).resolves.toBeDefined();
    });
  });
});
