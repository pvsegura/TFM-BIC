import { createContentId, isValidContentId } from "@tfm-bic/domain";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createLessonsTestDb, type LessonsTestDbHandle } from "./db/test-support/create-test-db.js";
import { DrizzleLessonProgressRepository } from "./lesson-progress.repository.js";

let handle: LessonsTestDbHandle;
let repository: DrizzleLessonProgressRepository;

beforeAll(async () => {
  handle = await createLessonsTestDb();
  repository = new DrizzleLessonProgressRepository(handle.db);
});

afterEach(async () => {
  await handle.reset();
});

afterAll(async () => {
  await handle.close();
});

const GREETINGS = createContentId("pl-greetings");
const INTRODUCING = createContentId("pl-introducing-yourself");
const POLITE = createContentId("pl-polite-words");
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

async function rows<T>(query: ReturnType<typeof sql>): Promise<T[]> {
  return ((await handle.rawExecute(query)) as { rows: T[] }).rows;
}

async function countProgress(): Promise<number> {
  const [row] = await rows<{ n: number }>(sql`SELECT count(*)::int AS n FROM lesson_progress`);
  return row?.n ?? -1;
}

describe("DrizzleLessonProgressRepository", () => {
  describe("findByUserAndLesson", () => {
    it("returns null when the student has no record for the lesson", async () => {
      const userId = await handle.seedUser();

      expect(await repository.findByUserAndLesson(userId, GREETINGS)).toBeNull();
    });

    it("returns the student's record", async () => {
      const userId = await handle.seedUser();
      await repository.start(userId, GREETINGS, T0);

      expect(await repository.findByUserAndLesson(userId, GREETINGS)).toEqual({
        userId,
        lessonId: GREETINGS,
        status: "in_progress",
        startedAt: T0,
        completedAt: null,
        updatedAt: T0,
      });
    });

    it("never returns another student's record", async () => {
      const ana = await handle.seedUser();
      const ben = await handle.seedUser();
      await repository.complete(ana, GREETINGS, T0);

      expect(await repository.findByUserAndLesson(ben, GREETINGS)).toBeNull();
    });
  });

  describe("findByUserAndLessons", () => {
    it("returns only the requested lessons for that student, in one call", async () => {
      const ana = await handle.seedUser();
      const ben = await handle.seedUser();
      await repository.start(ana, GREETINGS, T0);
      await repository.complete(ana, INTRODUCING, T1);
      await repository.complete(ana, POLITE, T1);
      await repository.complete(ben, GREETINGS, T2);

      const found = await repository.findByUserAndLessons(ana, [GREETINGS, INTRODUCING]);

      expect(found.map((record) => record.lessonId).sort()).toEqual([GREETINGS, INTRODUCING]);
      expect(found.every((record) => record.userId === ana)).toBe(true);
    });

    it("omits lessons the student has no record for", async () => {
      const userId = await handle.seedUser();
      await repository.start(userId, GREETINGS, T0);

      const found = await repository.findByUserAndLessons(userId, [GREETINGS, INTRODUCING]);

      expect(found.map((record) => record.lessonId)).toEqual([GREETINGS]);
    });

    it("returns an empty list for an empty request", async () => {
      const userId = await handle.seedUser();

      expect(await repository.findByUserAndLessons(userId, [])).toEqual([]);
    });
  });

  describe("start", () => {
    it("creates an in-progress record stamped with the given time", async () => {
      const userId = await handle.seedUser();

      const progress = await repository.start(userId, GREETINGS, T0);

      expect(progress).toEqual({
        userId,
        lessonId: GREETINGS,
        status: "in_progress",
        startedAt: T0,
        completedAt: null,
        updatedAt: T0,
      });
    });

    it("is repeatable: a second start keeps one row and the original start time", async () => {
      const userId = await handle.seedUser();
      await repository.start(userId, GREETINGS, T0);

      const again = await repository.start(userId, GREETINGS, T2);

      expect(again.startedAt).toEqual(T0);
      expect(again.updatedAt).toEqual(T0);
      expect(await countProgress()).toBe(1);
    });

    it("never takes a completed lesson back to in progress", async () => {
      const userId = await handle.seedUser();
      const done = await repository.complete(userId, GREETINGS, T1);

      const again = await repository.start(userId, GREETINGS, T2);

      expect(again).toEqual(done);
      expect(again.status).toBe("completed");
    });

    it("keeps each student's record separate", async () => {
      const ana = await handle.seedUser();
      const ben = await handle.seedUser();

      await repository.start(ana, GREETINGS, T0);
      await repository.start(ben, GREETINGS, T1);

      expect(await countProgress()).toBe(2);
      expect((await repository.findByUserAndLesson(ben, GREETINGS))?.startedAt).toEqual(T1);
    });
  });

  describe("complete", () => {
    it("completes a lesson that was never started, started and completed at the given time", async () => {
      const userId = await handle.seedUser();

      const progress = await repository.complete(userId, GREETINGS, T1);

      expect(progress).toEqual({
        userId,
        lessonId: GREETINGS,
        status: "completed",
        startedAt: T1,
        completedAt: T1,
        updatedAt: T1,
      });
    });

    it("completes an in-progress lesson, keeping when it was started", async () => {
      const userId = await handle.seedUser();
      await repository.start(userId, GREETINGS, T0);

      const progress = await repository.complete(userId, GREETINGS, T1);

      expect(progress).toEqual({
        userId,
        lessonId: GREETINGS,
        status: "completed",
        startedAt: T0,
        completedAt: T1,
        updatedAt: T1,
      });
      expect(await countProgress()).toBe(1);
    });

    it("is idempotent: complete, complete, complete leaves one row with the first completion time", async () => {
      const userId = await handle.seedUser();

      const first = await repository.complete(userId, GREETINGS, T0);
      await repository.complete(userId, GREETINGS, T1);
      const third = await repository.complete(userId, GREETINGS, T2);

      expect(third).toEqual(first);
      expect(third.completedAt).toEqual(T0);
      expect(await countProgress()).toBe(1);
    });

    it("stays one row when many completions arrive at once", async () => {
      const userId = await handle.seedUser();

      const results = await Promise.all(
        [T0, T1, T2, T0, T1].map((time) => repository.complete(userId, GREETINGS, time)),
      );

      expect(await countProgress()).toBe(1);
      const stored = await repository.findByUserAndLesson(userId, GREETINGS);
      expect(stored?.status).toBe("completed");
      // Whichever request won, every caller saw a completed lesson.
      expect(results.every((progress) => progress.status === "completed")).toBe(true);
    });

    it("ends completed whichever of a racing start and complete runs first", async () => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const userId = await handle.seedUser();

        await Promise.all([
          repository.start(userId, GREETINGS, T0),
          repository.complete(userId, GREETINGS, T1),
        ]);

        expect((await repository.findByUserAndLesson(userId, GREETINGS))?.status).toBe("completed");
      }
    });

    it("completes only the requested lesson, and only for that student", async () => {
      const ana = await handle.seedUser();
      const ben = await handle.seedUser();
      await repository.start(ben, GREETINGS, T0);

      await repository.complete(ana, GREETINGS, T1);

      expect(await repository.findByUserAndLesson(ana, INTRODUCING)).toBeNull();
      expect((await repository.findByUserAndLesson(ben, GREETINGS))?.status).toBe("in_progress");
    });
  });

  describe("integrity", () => {
    it("rejects progress for a user that does not exist (foreign key)", async () => {
      await expectConstraintViolation(
        repository.start(NIL_UUID, GREETINGS, T0),
        "lesson_progress_user_id_users_id_fk",
      );
    });

    it("removes a user's progress when the user is deleted, leaving no orphans", async () => {
      const userId = await handle.seedUser();
      await repository.complete(userId, GREETINGS, T0);
      await repository.start(userId, INTRODUCING, T0);

      await handle.rawExecute(sql`DELETE FROM users WHERE id = ${userId}`);

      expect(await countProgress()).toBe(0);
    });

    it("has one primary key over the student and the lesson, so a duplicate cannot exist", async () => {
      const userId = await handle.seedUser();
      await repository.start(userId, GREETINGS, T0);

      await expectConstraintViolation(
        handle.rawExecute(
          sql`INSERT INTO lesson_progress (user_id, lesson_id, status, started_at, updated_at)
              VALUES (${userId}, ${GREETINGS}, 'in_progress', ${T0.toISOString()}, ${T0.toISOString()})`,
        ),
        "lesson_progress_pk",
      );
    });

    it("rejects a status that is not stored (not_started is derived, never a row)", async () => {
      const userId = await handle.seedUser();

      await expectConstraintViolation(
        handle.rawExecute(
          sql`INSERT INTO lesson_progress (user_id, lesson_id, status, started_at, updated_at)
              VALUES (${userId}, ${GREETINGS}, 'not_started', ${T0.toISOString()}, ${T0.toISOString()})`,
        ),
        "lesson_progress_status_valid",
      );
    });

    it("rejects a completed row with no completion time, and an in-progress row that has one", async () => {
      const userId = await handle.seedUser();

      await expectConstraintViolation(
        handle.rawExecute(
          sql`INSERT INTO lesson_progress (user_id, lesson_id, status, started_at, updated_at)
              VALUES (${userId}, ${GREETINGS}, 'completed', ${T0.toISOString()}, ${T0.toISOString()})`,
        ),
        "lesson_progress_completion_consistent",
      );
      await expectConstraintViolation(
        handle.rawExecute(
          sql`INSERT INTO lesson_progress (user_id, lesson_id, status, started_at, completed_at, updated_at)
              VALUES (${userId}, ${INTRODUCING}, 'in_progress', ${T0.toISOString()}, ${T1.toISOString()}, ${T1.toISOString()})`,
        ),
        "lesson_progress_completion_consistent",
      );
    });

    it("rejects a lesson id that is not shaped like a content id, whatever wrote it", async () => {
      const userId = await handle.seedUser();
      const bad = ["PL-Greetings", "pl greetings", "../secret", "pl-x'; DROP TABLE users;--", ""];

      for (const lessonId of bad) {
        expect(isValidContentId(lessonId)).toBe(false);
        await expectConstraintViolation(
          handle.rawExecute(
            sql`INSERT INTO lesson_progress (user_id, lesson_id, status, started_at, updated_at)
                VALUES (${userId}, ${lessonId}, 'in_progress', ${T0.toISOString()}, ${T0.toISOString()})`,
          ),
          "lesson_progress_lesson_id_valid",
        );
      }
    });

    it("stores lesson ids as text, not as a foreign key: content lives in files (ADR-018)", async () => {
      const userId = await handle.seedUser();

      // A lesson that has since left the content (archived, renamed in error) keeps its history.
      await repository.complete(userId, createContentId("pl-retired-lesson"), T0);

      expect(await countProgress()).toBe(1);
    });
  });

  describe("migration", () => {
    it("creates lesson_progress with the documented columns", async () => {
      const columns = await rows<{ column_name: string; is_nullable: string }>(
        sql`SELECT column_name, is_nullable FROM information_schema.columns
            WHERE table_name = 'lesson_progress' ORDER BY column_name`,
      );

      expect(columns).toEqual([
        { column_name: "completed_at", is_nullable: "YES" },
        { column_name: "lesson_id", is_nullable: "NO" },
        { column_name: "started_at", is_nullable: "NO" },
        { column_name: "status", is_nullable: "NO" },
        { column_name: "updated_at", is_nullable: "NO" },
        { column_name: "user_id", is_nullable: "NO" },
      ]);
    });

    it("keys the table on (user_id, lesson_id) and adds no speculative index", async () => {
      const indexes = await rows<{ indexname: string }>(
        sql`SELECT indexname FROM pg_indexes WHERE tablename = 'lesson_progress'`,
      );

      expect(indexes.map((index) => index.indexname)).toEqual(["lesson_progress_pk"]);
    });
  });
});
