import { createVocabularyItemId } from "@tfm-bic/domain";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  createVocabularyTestDb,
  type VocabularyTestDbHandle,
} from "./db/test-support/create-test-db.js";
import { DrizzleUserVocabularyRepository } from "./user-vocabulary.repository.js";

let handle: VocabularyTestDbHandle;
let repository: DrizzleUserVocabularyRepository;

beforeAll(async () => {
  handle = await createVocabularyTestDb();
  repository = new DrizzleUserVocabularyRepository(handle.db);
});

afterEach(async () => {
  await handle.reset();
});

afterAll(async () => {
  await handle.close();
});

const DOM = createVocabularyItemId("pl-dom");
const KOT = createVocabularyItemId("pl-kot");
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
    sql`SELECT count(*)::int AS count FROM "user_vocabulary"`,
  )) as { rows: { count: number }[] };
  return result.rows[0]?.count ?? -1;
}

describe("DrizzleUserVocabularyRepository", () => {
  describe("save", () => {
    it("creates a saved record stamped with the given time", async () => {
      const userId = await handle.seedUser();

      const entry = await repository.save(userId, DOM, T0);

      expect(entry).toEqual({
        userId,
        vocabularyItemId: DOM,
        status: "saved",
        createdAt: T0,
        updatedAt: T0,
        learnedAt: null,
      });
    });

    it("does not create a duplicate, and does not regress an already-learned word", async () => {
      const userId = await handle.seedUser();
      await repository.changeStatus(userId, DOM, "learned", T0);

      const entry = await repository.save(userId, DOM, T1);

      expect(entry.status).toBe("learned");
      expect(await countRows()).toBe(1);
    });

    it("two concurrent saves of the same word by the same student leave exactly one row", async () => {
      const userId = await handle.seedUser();

      await Promise.all([repository.save(userId, DOM, T0), repository.save(userId, DOM, T1)]);

      expect(await countRows()).toBe(1);
    });
  });

  describe("changeStatus", () => {
    it("creates a record straight at the target status for a word with none", async () => {
      const userId = await handle.seedUser();

      const entry = await repository.changeStatus(userId, DOM, "learning", T0);

      expect(entry).toEqual({
        userId,
        vocabularyItemId: DOM,
        status: "learning",
        createdAt: T0,
        updatedAt: T0,
        learnedAt: null,
      });
    });

    it("moves a saved word forward to learned, stamping learnedAt", async () => {
      const userId = await handle.seedUser();
      await repository.save(userId, DOM, T0);

      const entry = await repository.changeStatus(userId, DOM, "learned", T1);

      expect(entry).toEqual({
        userId,
        vocabularyItemId: DOM,
        status: "learned",
        createdAt: T0,
        updatedAt: T1,
        learnedAt: T1,
      });
    });

    it("moves a learned word back to learning, clearing learnedAt", async () => {
      const userId = await handle.seedUser();
      await repository.changeStatus(userId, DOM, "learned", T0);

      const entry = await repository.changeStatus(userId, DOM, "learning", T1);

      expect(entry).toEqual({
        userId,
        vocabularyItemId: DOM,
        status: "learning",
        createdAt: T0,
        updatedAt: T1,
        learnedAt: null,
      });
    });

    it("refuses any other step back, leaving the record exactly as it was", async () => {
      const userId = await handle.seedUser();
      await repository.changeStatus(userId, DOM, "learned", T0);

      const entry = await repository.changeStatus(userId, DOM, "saved", T1);

      expect(entry).toEqual({
        userId,
        vocabularyItemId: DOM,
        status: "learned",
        createdAt: T0,
        updatedAt: T0,
        learnedAt: T0,
      });
    });

    it("treats the same status as a no-op, keeping the original timestamps", async () => {
      const userId = await handle.seedUser();
      await repository.changeStatus(userId, DOM, "saved", T0);

      const entry = await repository.changeStatus(userId, DOM, "saved", T1);

      expect(entry.updatedAt).toEqual(T0);
    });

    it("two concurrent transitions of the same word leave one consistent row, never a duplicate", async () => {
      const userId = await handle.seedUser();
      await repository.save(userId, DOM, T0);

      await Promise.all([
        repository.changeStatus(userId, DOM, "learning", T1),
        repository.changeStatus(userId, DOM, "learned", T2),
      ]);

      expect(await countRows()).toBe(1);
      const entry = await repository.findByUserAndItem(userId, DOM);
      expect(["learning", "learned"]).toContain(entry?.status);
    });
  });

  describe("remove", () => {
    it("deletes the student's record for the word", async () => {
      const userId = await handle.seedUser();
      await repository.save(userId, DOM, T0);

      await repository.remove(userId, DOM);

      expect(await repository.findByUserAndItem(userId, DOM)).toBeNull();
    });

    it("does nothing for a word the student never saved", async () => {
      const userId = await handle.seedUser();

      await expect(repository.remove(userId, DOM)).resolves.toBeUndefined();
    });

    it("never removes another student's record", async () => {
      const owner = await handle.seedUser("owner@example.com");
      const other = await handle.seedUser("other@example.com");
      await repository.save(owner, DOM, T0);

      await repository.remove(other, DOM);

      expect(await repository.findByUserAndItem(owner, DOM)).not.toBeNull();
    });
  });

  describe("reads", () => {
    it("finds several entries in one round trip", async () => {
      const userId = await handle.seedUser();
      await repository.save(userId, DOM, T0);
      await repository.save(userId, KOT, T0);

      const found = await repository.findByUserAndItems(userId, [DOM, KOT]);

      expect(found.map((e) => e.vocabularyItemId).sort()).toEqual(["pl-dom", "pl-kot"]);
    });

    it("returns nothing for an empty id list, without a query", async () => {
      const userId = await handle.seedUser();

      expect(await repository.findByUserAndItems(userId, [])).toEqual([]);
    });

    it("lists every record of one student, of any status", async () => {
      const userId = await handle.seedUser();
      await repository.save(userId, DOM, T0);
      await repository.changeStatus(userId, KOT, "learned", T0);

      const all = await repository.listByUser(userId);

      expect(all.map((e) => e.vocabularyItemId).sort()).toEqual(["pl-dom", "pl-kot"]);
    });
  });

  describe("constraints", () => {
    it("refuses an unknown status", async () => {
      const userId = await handle.seedUser();

      await expectConstraintViolation(
        handle.rawExecute(
          sql`INSERT INTO "user_vocabulary" (user_id, vocabulary_item_id, status, created_at, updated_at, learned_at)
              VALUES (${userId}, ${DOM}, 'mastered', now(), now(), null)`,
        ),
        "user_vocabulary_status_valid",
      );
    });

    it("refuses a learned row with no learned_at, and a non-learned row with one", async () => {
      const userId = await handle.seedUser();

      await expectConstraintViolation(
        handle.rawExecute(
          sql`INSERT INTO "user_vocabulary" (user_id, vocabulary_item_id, status, created_at, updated_at, learned_at)
              VALUES (${userId}, ${DOM}, 'learned', now(), now(), null)`,
        ),
        "user_vocabulary_learned_consistent",
      );
      await expectConstraintViolation(
        handle.rawExecute(
          sql`INSERT INTO "user_vocabulary" (user_id, vocabulary_item_id, status, created_at, updated_at, learned_at)
              VALUES (${userId}, ${KOT}, 'saved', now(), now(), now())`,
        ),
        "user_vocabulary_learned_consistent",
      );
    });

    it("refuses a malformed vocabulary item id", async () => {
      const userId = await handle.seedUser();

      await expectConstraintViolation(
        handle.rawExecute(
          sql`INSERT INTO "user_vocabulary" (user_id, vocabulary_item_id, status, created_at, updated_at, learned_at)
              VALUES (${userId}, 'Not Valid', 'saved', now(), now(), null)`,
        ),
        "user_vocabulary_item_id_valid",
      );
    });

    it("refuses a record for a user that does not exist", async () => {
      await expectConstraintViolation(
        repository.save(NIL_UUID, DOM, T0),
        "user_vocabulary_user_id_users_id_fk",
      );
    });

    it("deletes a student's records when the user is deleted", async () => {
      const userId = await handle.seedUser();
      await repository.save(userId, DOM, T0);

      await handle.rawExecute(sql`DELETE FROM "users" WHERE id = ${userId}`);

      expect(await countRows()).toBe(0);
    });
  });
});
