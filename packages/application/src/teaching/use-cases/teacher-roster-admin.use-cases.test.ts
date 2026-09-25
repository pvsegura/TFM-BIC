import { InvalidTeacherStudentLinkError } from "@tfm-bic/domain";
import { beforeEach, describe, expect, it } from "vitest";

import { FakeUserRepository, FixedClock } from "../../identity/test-support/fakes.js";
import { TeachingUserNotFoundError } from "../teaching-user-not-found.error.js";
import { FakeTeacherStudentLinkRepository } from "../test-support/fakes.js";
import {
  LinkStudentToTeacherUseCase,
  PromoteUserToTeacherUseCase,
  UnlinkStudentFromTeacherUseCase,
} from "./teacher-roster-admin.use-cases.js";

const NOW = new Date("2026-09-25T10:00:00.000Z");

let users: FakeUserRepository;
let links: FakeTeacherStudentLinkRepository;
let promote: PromoteUserToTeacherUseCase;
let link: LinkStudentToTeacherUseCase;
let unlink: UnlinkStudentFromTeacherUseCase;

const seed = (email: string, role: "STUDENT" | "TEACHER") =>
  users.seed(role, { email, normalizedEmail: email.toLowerCase() });

beforeEach(() => {
  const clock = new FixedClock(NOW);
  users = new FakeUserRepository(clock);
  links = new FakeTeacherStudentLinkRepository();
  promote = new PromoteUserToTeacherUseCase(users, links);
  link = new LinkStudentToTeacherUseCase(users, links, clock);
  unlink = new UnlinkStudentFromTeacherUseCase(users, links);
});

describe("PromoteUserToTeacherUseCase", () => {
  it("changes a student's role to TEACHER, finding them by normalized email", async () => {
    const user = seed("teacher@example.com", "STUDENT");

    const result = await promote.execute({ email: "  Teacher@Example.com " });

    expect(result).toEqual({ userId: user.id, changed: true });
    expect((await users.findById(user.id))?.role).toBe("TEACHER");
  });

  it("is idempotent for someone who already is a teacher", async () => {
    seed("t@example.com", "TEACHER");
    expect((await promote.execute({ email: "t@example.com" })).changed).toBe(false);
  });

  it("refuses to promote a student who is linked to a teacher", async () => {
    const teacher = seed("t@example.com", "TEACHER");
    const student = seed("s@example.com", "STUDENT");
    await links.link(teacher.id, student.id, NOW);

    await expect(promote.execute({ email: "s@example.com" })).rejects.toBeInstanceOf(
      InvalidTeacherStudentLinkError,
    );
    expect((await users.findById(student.id))?.role).toBe("STUDENT");
  });

  it("reports an unknown email without creating anything", async () => {
    await expect(promote.execute({ email: "nobody@example.com" })).rejects.toBeInstanceOf(
      TeachingUserNotFoundError,
    );
  });
});

describe("LinkStudentToTeacherUseCase", () => {
  it("links a student to a teacher, idempotently", async () => {
    const teacher = seed("t@example.com", "TEACHER");
    const student = seed("s@example.com", "STUDENT");

    expect(
      await link.execute({ teacherEmail: "t@example.com", studentEmail: "s@example.com" }),
    ).toEqual({
      teacherId: teacher.id,
      studentId: student.id,
      created: true,
    });
    expect(
      (await link.execute({ teacherEmail: "t@example.com", studentEmail: "s@example.com" }))
        .created,
    ).toBe(false);
    expect(links.links).toEqual([{ teacherId: teacher.id, studentId: student.id, linkedAt: NOW }]);
  });

  it("enforces the domain's link rules", async () => {
    seed("t@example.com", "TEACHER");
    seed("t2@example.com", "TEACHER");
    seed("s@example.com", "STUDENT");

    await expect(
      link.execute({ teacherEmail: "s@example.com", studentEmail: "t@example.com" }),
    ).rejects.toBeInstanceOf(InvalidTeacherStudentLinkError);
    await expect(
      link.execute({ teacherEmail: "t@example.com", studentEmail: "t2@example.com" }),
    ).rejects.toBeInstanceOf(InvalidTeacherStudentLinkError);
    expect(links.links).toEqual([]);
  });

  it("reports an unknown teacher or student", async () => {
    seed("t@example.com", "TEACHER");
    await expect(
      link.execute({ teacherEmail: "t@example.com", studentEmail: "missing@example.com" }),
    ).rejects.toBeInstanceOf(TeachingUserNotFoundError);
    await expect(
      link.execute({ teacherEmail: "missing@example.com", studentEmail: "t@example.com" }),
    ).rejects.toBeInstanceOf(TeachingUserNotFoundError);
  });
});

describe("UnlinkStudentFromTeacherUseCase", () => {
  it("removes a link and reports whether there was one", async () => {
    const teacher = seed("t@example.com", "TEACHER");
    const student = seed("s@example.com", "STUDENT");
    await links.link(teacher.id, student.id, NOW);

    const input = { teacherEmail: "t@example.com", studentEmail: "s@example.com" };
    expect((await unlink.execute(input)).removed).toBe(true);
    expect((await unlink.execute(input)).removed).toBe(false);
    expect(links.links).toEqual([]);
  });
});
