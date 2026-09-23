import { createPhoneticRepresentationId } from "@tfm-bic/domain";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  createPhoneticsTestDb,
  type PhoneticsTestDbHandle,
} from "./db/test-support/create-test-db.js";
import { DrizzleUserPhoneticProgressRepository } from "./user-phonetic-progress.repository.js";

let handle: PhoneticsTestDbHandle;
let repository: DrizzleUserPhoneticProgressRepository;

beforeAll(async () => {
  handle = await createPhoneticsTestDb();
  repository = new DrizzleUserPhoneticProgressRepository(handle.db);
});

afterEach(async () => {
  await handle.reset();
});

afterAll(async () => {
  await handle.close();
});

const TS = createPhoneticRepresentationId("pl-ipa-ts");
const A = createPhoneticRepresentationId("pl-ipa-a");
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

const T0 = new Date("2026-01-01T10:00:00.000Z");
const T1 = new Date("2026-01-01T10:05:00.000Z");
const T2 = new Date("2026-01-01T10:10:00.000Z");

function messagesOf(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  while (current instanceof Error) {
    parts.push(current.message);
    current = current.cause;
  }
  return parts.join(" | ");
}

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

async function countRows(): Promise<number> {
  const result = (await handle.rawExecute(
    sql`SELECT count(*)::int AS count FROM "user_phonetic_progress"`,
  )) as { rows: { count: number }[] };
  return result.rows[0]?.count ?? -1;
}

describe("DrizzleUserPhoneticProgressRepository", () => {
  describe("recordView", () => {
    it("creates a viewed record stamped with the given time", async () => {
      const userId = await handle.seedUser();

      const progress = await repository.recordView(userId, TS, T0);

      expect(progress).toEqual({
        userId,
        phoneticRepresentationId: TS,
        status: "viewed",
        firstViewedAt: T0,
        lastViewedAt: T0,
        practicedAt: null,
        completedAt: null,
      });
    });

    it("keeps the first view time but refreshes the last view time on a repeat visit", async () => {
      const userId = await handle.seedUser();
      await repository.recordView(userId, TS, T0);

      const progress = await repository.recordView(userId, TS, T2);

      expect(progress).toEqual({
        userId,
        phoneticRepresentationId: TS,
        status: "viewed",
        firstViewedAt: T0,
        lastViewedAt: T2,
        practicedAt: null,
        completedAt: null,
      });
    });

    it("never takes a completed representation back to viewed, but still refreshes the last view time", async () => {
      const userId = await handle.seedUser();
      await repository.complete(userId, TS, T0);

      const progress = await repository.recordView(userId, TS, T2);

      expect(progress.status).toBe("completed");
      expect(progress.lastViewedAt).toEqual(T2);
      expect(progress.completedAt).toEqual(T0);
    });

    it("two concurrent views of the same representation leave exactly one row", async () => {
      const userId = await handle.seedUser();

      await Promise.all([
        repository.recordView(userId, TS, T0),
        repository.recordView(userId, TS, T1),
      ]);

      expect(await countRows()).toBe(1);
    });
  });

  describe("recordPractice", () => {
    it("creates a practiced record directly, viewed and practiced at the same moment", async () => {
      const userId = await handle.seedUser();

      const progress = await repository.recordPractice(userId, TS, T0);

      expect(progress).toEqual({
        userId,
        phoneticRepresentationId: TS,
        status: "practiced",
        firstViewedAt: T0,
        lastViewedAt: T0,
        practicedAt: T0,
        completedAt: null,
      });
    });

    it("advances a viewed representation to practiced", async () => {
      const userId = await handle.seedUser();
      await repository.recordView(userId, TS, T0);

      const progress = await repository.recordPractice(userId, TS, T1);

      expect(progress).toEqual({
        userId,
        phoneticRepresentationId: TS,
        status: "practiced",
        firstViewedAt: T0,
        lastViewedAt: T1,
        practicedAt: T1,
        completedAt: null,
      });
    });

    it("never takes a completed representation back to practiced, but still refreshes its practice time", async () => {
      const userId = await handle.seedUser();
      await repository.complete(userId, TS, T0);

      const progress = await repository.recordPractice(userId, TS, T2);

      expect(progress.status).toBe("completed");
      expect(progress.practicedAt).toEqual(T2);
      expect(progress.completedAt).toEqual(T0);
    });
  });

  describe("complete", () => {
    it("completes a representation that was never viewed or practiced, all at the same moment", async () => {
      const userId = await handle.seedUser();

      const progress = await repository.complete(userId, TS, T1);

      expect(progress).toEqual({
        userId,
        phoneticRepresentationId: TS,
        status: "completed",
        firstViewedAt: T1,
        lastViewedAt: T1,
        practicedAt: null,
        completedAt: T1,
      });
    });

    it("completes a practiced representation, keeping its practice time", async () => {
      const userId = await handle.seedUser();
      await repository.recordPractice(userId, TS, T0);

      const progress = await repository.complete(userId, TS, T2);

      expect(progress).toEqual({
        userId,
        phoneticRepresentationId: TS,
        status: "completed",
        firstViewedAt: T0,
        lastViewedAt: T2,
        practicedAt: T0,
        completedAt: T2,
      });
    });

    it("is idempotent: completing again changes nothing, not even the completion time", async () => {
      const userId = await handle.seedUser();
      await repository.complete(userId, TS, T0);

      const progress = await repository.complete(userId, TS, T2);

      expect(progress.completedAt).toEqual(T0);
      expect(progress.lastViewedAt).toEqual(T0);
    });

    it("two concurrent completions of the same representation leave one consistent row, never a duplicate", async () => {
      const userId = await handle.seedUser();

      await Promise.all([repository.complete(userId, TS, T0), repository.complete(userId, TS, T1)]);

      expect(await countRows()).toBe(1);
      const progress = await repository.findByUserAndRepresentation(userId, TS);
      expect(progress?.status).toBe("completed");
    });
  });

  describe("reads", () => {
    it("finds several records in one round trip", async () => {
      const userId = await handle.seedUser();
      await repository.recordView(userId, TS, T0);
      await repository.recordView(userId, A, T0);

      const found = await repository.findByUserAndRepresentations(userId, [TS, A]);

      expect(found.map((e) => e.phoneticRepresentationId).sort()).toEqual([
        "pl-ipa-a",
        "pl-ipa-ts",
      ]);
    });

    it("returns nothing for an empty id list, without a query", async () => {
      const userId = await handle.seedUser();

      expect(await repository.findByUserAndRepresentations(userId, [])).toEqual([]);
    });

    it("lists every record of one student, of any status", async () => {
      const userId = await handle.seedUser();
      await repository.recordView(userId, TS, T0);
      await repository.complete(userId, A, T0);

      const all = await repository.listByUser(userId);

      expect(all.map((e) => e.phoneticRepresentationId).sort()).toEqual(["pl-ipa-a", "pl-ipa-ts"]);
    });

    it("never returns another student's record", async () => {
      const owner = await handle.seedUser("owner@example.com");
      const other = await handle.seedUser("other@example.com");
      await repository.recordView(owner, TS, T0);

      expect(await repository.findByUserAndRepresentation(other, TS)).toBeNull();
    });
  });

  describe("constraints", () => {
    it("refuses an unknown status", async () => {
      const userId = await handle.seedUser();

      await expectConstraintViolation(
        handle.rawExecute(
          sql`INSERT INTO "user_phonetic_progress" (user_id, phonetic_representation_id, status, first_viewed_at, last_viewed_at, practiced_at, completed_at)
              VALUES (${userId}, ${TS}, 'mastered', now(), now(), null, null)`,
        ),
        "user_phonetic_progress_status_valid",
      );
    });

    it("refuses a completed row with no completed_at, and a non-completed row with one", async () => {
      const userId = await handle.seedUser();

      await expectConstraintViolation(
        handle.rawExecute(
          sql`INSERT INTO "user_phonetic_progress" (user_id, phonetic_representation_id, status, first_viewed_at, last_viewed_at, practiced_at, completed_at)
              VALUES (${userId}, ${TS}, 'completed', now(), now(), null, null)`,
        ),
        "user_phonetic_progress_completed_consistent",
      );
      await expectConstraintViolation(
        handle.rawExecute(
          sql`INSERT INTO "user_phonetic_progress" (user_id, phonetic_representation_id, status, first_viewed_at, last_viewed_at, practiced_at, completed_at)
              VALUES (${userId}, ${A}, 'viewed', now(), now(), null, now())`,
        ),
        "user_phonetic_progress_completed_consistent",
      );
    });

    it("refuses a malformed phonetic representation id", async () => {
      const userId = await handle.seedUser();

      await expectConstraintViolation(
        handle.rawExecute(
          sql`INSERT INTO "user_phonetic_progress" (user_id, phonetic_representation_id, status, first_viewed_at, last_viewed_at, practiced_at, completed_at)
              VALUES (${userId}, 'Not Valid', 'viewed', now(), now(), null, null)`,
        ),
        "user_phonetic_progress_representation_id_valid",
      );
    });

    it("refuses a record for a user that does not exist", async () => {
      await expectConstraintViolation(
        repository.recordView(NIL_UUID, TS, T0),
        "user_phonetic_progress_user_id_users_id_fk",
      );
    });

    it("deletes a student's records when the user is deleted", async () => {
      const userId = await handle.seedUser();
      await repository.recordView(userId, TS, T0);

      await handle.rawExecute(sql`DELETE FROM "users" WHERE id = ${userId}`);

      expect(await countRows()).toBe(0);
    });
  });
});
