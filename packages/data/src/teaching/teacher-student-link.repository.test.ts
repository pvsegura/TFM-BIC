import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createGamificationTestDb,
  type GamificationTestDbHandle,
} from "../gamification/db/test-support/create-test-db.js";
import { DrizzleTeacherStudentLinkRepository } from "./teacher-student-link.repository.js";

const NOW = new Date("2026-09-25T10:00:00.000Z");

let handle: GamificationTestDbHandle;
let repository: DrizzleTeacherStudentLinkRepository;

beforeAll(async () => {
  handle = await createGamificationTestDb();
  repository = new DrizzleTeacherStudentLinkRepository(handle.teachingDb);
});

afterAll(async () => {
  await handle.close();
});

beforeEach(async () => {
  await handle.reset();
});

describe("DrizzleTeacherStudentLinkRepository (real Postgres via PGlite)", () => {
  it("links once: a repeated link writes nothing and reports false", async () => {
    const teacher = await handle.seedUser("t@example.com", "TEACHER");
    const student = await handle.seedUser("s@example.com");

    expect(await repository.link(teacher, student, NOW)).toBe(true);
    expect(await repository.link(teacher, student, NOW)).toBe(false);

    const rows = await handle.rawExecute(sql`SELECT count(*)::int AS n FROM teacher_students`);
    expect((rows as { rows: { n: number }[] }).rows[0]?.n).toBe(1);
  });

  it("unlinks and reports whether a link existed", async () => {
    const teacher = await handle.seedUser("t@example.com", "TEACHER");
    const student = await handle.seedUser("s@example.com");
    await repository.link(teacher, student, NOW);

    expect(await repository.unlink(teacher, student)).toBe(true);
    expect(await repository.unlink(teacher, student)).toBe(false);
  });

  it("knows whether a user is anyone's student", async () => {
    const teacher = await handle.seedUser("t@example.com", "TEACHER");
    const student = await handle.seedUser("s@example.com");
    expect(await repository.isLinkedAsStudent(student)).toBe(false);

    await repository.link(teacher, student, NOW);

    expect(await repository.isLinkedAsStudent(student)).toBe(true);
    expect(await repository.isLinkedAsStudent(teacher)).toBe(false);
  });

  it("refuses a self-link at the database level", async () => {
    const user = await handle.seedUser("t@example.com", "TEACHER");
    await expect(repository.link(user, user, NOW)).rejects.toThrow();
  });

  it("removes the links of a deleted user (ON DELETE CASCADE)", async () => {
    const teacher = await handle.seedUser("t@example.com", "TEACHER");
    const student = await handle.seedUser("s@example.com");
    await repository.link(teacher, student, NOW);

    await handle.rawExecute(sql`DELETE FROM users WHERE id = ${student}`);

    expect(await repository.isLinkedAsStudent(student)).toBe(false);
    expect(await repository.unlink(teacher, student)).toBe(false);
  });
});
