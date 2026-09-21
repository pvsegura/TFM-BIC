import {
  createExerciseId,
  summarizeAttempts,
  type ExerciseAttempt,
  type NewExerciseAttempt,
} from "@tfm-bic/domain";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { exerciseAttempts } from "./db/schema.js";
import {
  createExercisesTestDb,
  type ExercisesTestDbHandle,
} from "./db/test-support/create-test-db.js";
import { DrizzleExerciseAttemptRepository } from "./exercise-attempt.repository.js";

/**
 * Against a real (WASM) Postgres with the migrations applied, so constraints,
 * foreign keys, the jsonb column and the "latest attempt" query are proved, not
 * assumed. PGlite serialises queries, so true multi-connection concurrency is
 * not exercised here (the single INSERT is atomic by construction).
 */
let handle: ExercisesTestDbHandle;
let repository: DrizzleExerciseAttemptRepository;
let ana: string;
let ben: string;

beforeAll(async () => {
  handle = await createExercisesTestDb();
  repository = new DrizzleExerciseAttemptRepository(handle.db);
});

afterAll(async () => {
  await handle.close();
});

beforeEach(async () => {
  await handle.reset();
  ana = await handle.seedUser("ana@example.com");
  ben = await handle.seedUser("ben@example.com");
});

const id = createExerciseId;
const at = (time: string) => new Date(`2026-01-01T${time}.000Z`);

function attempt(
  userId: string,
  exerciseId: string,
  overrides: Partial<NewExerciseAttempt> = {},
): NewExerciseAttempt {
  return {
    userId,
    exerciseId: id(exerciseId),
    submittedAnswer: "opt-a",
    correct: true,
    answeredAt: at("10:00:00"),
    ...overrides,
  };
}

async function rowCount(): Promise<number> {
  const result = await handle.rawExecute(sql`SELECT count(*)::int AS n FROM exercise_attempts`);
  return (result as { rows: { n: number }[] }).rows[0]?.n ?? -1;
}

describe("DrizzleExerciseAttemptRepository.record", () => {
  it("stores an attempt and returns it with the id storage assigned", async () => {
    const stored = await repository.record(attempt(ana, "pl-greetings-hello"));

    expect(stored).toEqual({
      id: expect.any(Number) as number,
      userId: ana,
      exerciseId: "pl-greetings-hello",
      submittedAnswer: "opt-a",
      correct: true,
      answeredAt: at("10:00:00"),
    });
    expect(stored.id).toBeGreaterThan(0);
  });

  it("writes the time it is given, never the database's clock", async () => {
    const stored = await repository.record(
      attempt(ana, "pl-greetings-hello", { answeredAt: new Date("1999-12-31T23:59:59.123Z") }),
    );

    expect(stored.answeredAt).toEqual(new Date("1999-12-31T23:59:59.123Z"));
  });

  it("appends: every submission is its own row and earlier rows are left exactly as they were", async () => {
    const first = await repository.record(
      attempt(ana, "pl-greetings-hello", { correct: false, submittedAnswer: "opt-b" }),
    );
    const second = await repository.record(
      attempt(ana, "pl-greetings-hello", { correct: false, submittedAnswer: "opt-c" }),
    );
    const third = await repository.record(
      attempt(ana, "pl-greetings-hello", { correct: true, submittedAnswer: "opt-a" }),
    );

    expect(await rowCount()).toBe(3);
    expect([first.id, second.id, third.id]).toEqual(
      [...[first.id, second.id, third.id]].sort((a, b) => a - b),
    );
    expect(new Set([first.id, second.id, third.id]).size).toBe(3);
    const rows = await handle.rawExecute(
      sql`SELECT submitted_answer, correct FROM exercise_attempts ORDER BY id`,
    );
    expect((rows as { rows: unknown[] }).rows).toEqual([
      { submitted_answer: "opt-b", correct: false },
      { submitted_answer: "opt-c", correct: false },
      { submitted_answer: "opt-a", correct: true },
    ]);
  });

  it("keeps the type of the answer: a boolean stays a boolean and the text 'true' stays text", async () => {
    await repository.record(attempt(ana, "pl-a-one", { submittedAnswer: true }));
    await repository.record(attempt(ana, "pl-a-two", { submittedAnswer: "true" }));
    await repository.record(attempt(ana, "pl-a-three", { submittedAnswer: false }));

    const rows = await handle.rawExecute(
      sql`SELECT exercise_id, submitted_answer, jsonb_typeof(submitted_answer) AS kind FROM exercise_attempts ORDER BY id`,
    );
    expect((rows as { rows: unknown[] }).rows).toEqual([
      { exercise_id: "pl-a-one", submitted_answer: true, kind: "boolean" },
      { exercise_id: "pl-a-two", submitted_answer: "true", kind: "string" },
      { exercise_id: "pl-a-three", submitted_answer: false, kind: "boolean" },
    ]);
  });

  it("returns the answer as it was stored: unicode, quotes and SQL-looking text are data", async () => {
    const answers = [
      "żółty",
      "Miło mi cię poznać.",
      `He said "hi" \\ and 'bye'`,
      "'; DROP TABLE exercise_attempts;--",
      "<script>alert(1)</script>",
      "مرحبا",
    ];

    for (const answer of answers) {
      const stored = await repository.record(
        attempt(ana, "pl-a-text", { submittedAnswer: answer }),
      );
      expect(stored.submittedAnswer).toBe(answer);
    }
    expect(await rowCount()).toBe(answers.length);
  });

  it("refuses an attempt for a user that does not exist — no orphaned attempts", async () => {
    await expect(
      repository.record(attempt("11111111-1111-4111-8111-111111111111", "pl-a-one")),
    ).rejects.toThrow();
    expect(await rowCount()).toBe(0);
  });

  it("refuses a malformed exercise id at the database, not only in application code", async () => {
    await expect(
      handle.rawExecute(
        sql`INSERT INTO exercise_attempts (user_id, exercise_id, submitted_answer, correct, answered_at)
            VALUES (${ana}, 'Not A Valid Id!', '"x"', true, now())`,
      ),
    ).rejects.toThrow();
  });

  it("refuses an oversized answer at the database", async () => {
    await expect(
      repository.record(attempt(ana, "pl-a-one", { submittedAnswer: "a".repeat(5000) })),
    ).rejects.toThrow();
    expect(await rowCount()).toBe(0);
  });

  it("removes a user's attempts with the user (no orphans) and leaves everyone else's", async () => {
    await repository.record(attempt(ana, "pl-a-one"));
    await repository.record(attempt(ben, "pl-a-one"));

    await handle.rawExecute(sql`DELETE FROM users WHERE id = ${ana}`);

    const remaining = await handle.rawExecute(sql`SELECT user_id FROM exercise_attempts`);
    expect((remaining as { rows: { user_id: string }[] }).rows.map((r) => r.user_id)).toEqual([
      ben,
    ]);
  });
});

describe("DrizzleExerciseAttemptRepository.findSummaries", () => {
  it("counts every attempt and reports the latest one's correctness and time", async () => {
    await repository.record(
      attempt(ana, "pl-a-one", { correct: false, answeredAt: at("10:00:00") }),
    );
    await repository.record(
      attempt(ana, "pl-a-one", { correct: false, answeredAt: at("10:01:00") }),
    );
    await repository.record(
      attempt(ana, "pl-a-one", { correct: true, answeredAt: at("10:02:00") }),
    );

    const summaries = await repository.findSummaries(ana, [id("pl-a-one")]);

    expect(summaries).toEqual([
      {
        exerciseId: "pl-a-one",
        attemptCount: 3,
        latestCorrect: true,
        latestAnsweredAt: at("10:02:00"),
      },
    ]);
  });

  it("does not let an earlier correct attempt hide a later incorrect one", async () => {
    await repository.record(
      attempt(ana, "pl-a-one", { correct: true, answeredAt: at("10:00:00") }),
    );
    await repository.record(
      attempt(ana, "pl-a-one", { correct: false, answeredAt: at("10:09:00") }),
    );

    const [summary] = await repository.findSummaries(ana, [id("pl-a-one")]);

    expect(summary).toMatchObject({ latestCorrect: false, attemptCount: 2 });
  });

  it("breaks a tie on the timestamp by insertion order: the later insert is the latest", async () => {
    await repository.record(attempt(ana, "pl-a-one", { correct: true }));
    await repository.record(attempt(ana, "pl-a-one", { correct: false }));

    const [summary] = await repository.findSummaries(ana, [id("pl-a-one")]);

    expect(summary?.latestCorrect).toBe(false);
  });

  it("answers for several exercises in one call and leaves out those never attempted", async () => {
    await repository.record(attempt(ana, "pl-a-one", { correct: true }));
    await repository.record(attempt(ana, "pl-a-two", { correct: false }));

    const summaries = await repository.findSummaries(ana, [
      id("pl-a-one"),
      id("pl-a-two"),
      id("pl-a-never"),
    ]);

    expect(summaries.map((s) => [s.exerciseId, s.latestCorrect, s.attemptCount]).sort()).toEqual([
      ["pl-a-one", true, 1],
      ["pl-a-two", false, 1],
    ]);
  });

  it("only ever considers the given user's attempts", async () => {
    await repository.record(attempt(ben, "pl-a-one", { correct: true }));
    await repository.record(attempt(ben, "pl-a-one", { correct: true }));
    await repository.record(attempt(ana, "pl-a-one", { correct: false }));

    expect(await repository.findSummaries(ana, [id("pl-a-one")])).toMatchObject([
      { attemptCount: 1, latestCorrect: false },
    ]);
    expect(await repository.findSummaries(ben, [id("pl-a-one")])).toMatchObject([
      { attemptCount: 2, latestCorrect: true },
    ]);
  });

  it("returns nothing for a user with no attempts, and needs no query for an empty request", async () => {
    expect(await repository.findSummaries(ana, [id("pl-a-one")])).toEqual([]);
    expect(await repository.findSummaries(ana, [])).toEqual([]);
  });

  it("agrees with the domain's own definition of 'latest' on a mixed history", async () => {
    const written: ExerciseAttempt[] = [];
    const script: [string, boolean, string][] = [
      ["pl-a-one", false, "10:00:00"],
      ["pl-a-two", true, "10:00:01"],
      ["pl-a-one", true, "10:00:05"],
      ["pl-a-one", false, "10:00:05"],
      ["pl-a-two", false, "09:59:00"],
      ["pl-a-three", true, "10:00:00"],
    ];
    for (const [exercise, correct, time] of script) {
      written.push(
        await repository.record(attempt(ana, exercise, { correct, answeredAt: at(time) })),
      );
    }

    const fromSql = await repository.findSummaries(ana, [
      id("pl-a-one"),
      id("pl-a-two"),
      id("pl-a-three"),
    ]);

    for (const summary of fromSql) {
      expect(summary).toEqual(summarizeAttempts(summary.exerciseId, written));
    }
    expect(fromSql).toHaveLength(3);
  });
});

describe("the exercise_attempts table", () => {
  it("has the index the queries need, and no others besides the primary key", async () => {
    const result = await handle.rawExecute(
      sql`SELECT indexname FROM pg_indexes WHERE tablename = 'exercise_attempts' ORDER BY indexname`,
    );

    expect((result as { rows: { indexname: string }[] }).rows.map((r) => r.indexname)).toEqual([
      "exercise_attempts_pkey",
      "exercise_attempts_user_exercise_answered_idx",
    ]);
  });

  it("is declared with the schema this repository is written against", () => {
    expect(Object.keys(exerciseAttempts).sort()).toEqual(
      expect.arrayContaining([
        "answeredAt",
        "correct",
        "exerciseId",
        "id",
        "submittedAnswer",
        "userId",
      ]),
    );
  });
});
