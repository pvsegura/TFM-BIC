import {
  LinkStudentToTeacherUseCase,
  PromoteUserToTeacherUseCase,
  UnlinkStudentFromTeacherUseCase,
} from "@tfm-bic/application";
import {
  FakeTeacherStudentLinkRepository,
  FakeUserRepository,
  FixedClock,
} from "@tfm-bic/application/testing";
import { beforeEach, describe, expect, it } from "vitest";

import { runTeacherAdminCommand, TEACHER_ADMIN_USAGE } from "./teacher-admin-command.js";

const NOW = new Date("2026-09-25T10:00:00.000Z");
let users: FakeUserRepository;
let links: FakeTeacherStudentLinkRepository;
let run: (argv: string[]) => ReturnType<typeof runTeacherAdminCommand>;

beforeEach(() => {
  const clock = new FixedClock(NOW);
  users = new FakeUserRepository(clock);
  links = new FakeTeacherStudentLinkRepository();
  const useCases = {
    promote: new PromoteUserToTeacherUseCase(users, links),
    link: new LinkStudentToTeacherUseCase(users, links, clock),
    unlink: new UnlinkStudentFromTeacherUseCase(users, links),
  };
  run = (argv) => runTeacherAdminCommand(argv, useCases);
  users.seed("STUDENT", { email: "t@example.com", normalizedEmail: "t@example.com" });
  users.seed("STUDENT", { email: "s@example.com", normalizedEmail: "s@example.com" });
});

describe("teacher:admin command", () => {
  it("promotes, links and unlinks, reporting each outcome without printing ids or emails", async () => {
    expect(await run(["promote", "t@example.com"])).toEqual({
      exitCode: 0,
      message: "Promoted the account to TEACHER.",
    });
    expect(await run(["promote", "t@example.com"])).toEqual({
      exitCode: 0,
      message: "The account already is a TEACHER; nothing changed.",
    });
    expect(await run(["link", "t@example.com", "s@example.com"])).toEqual({
      exitCode: 0,
      message: "Linked the student to the teacher.",
    });
    expect(await run(["link", "t@example.com", "s@example.com"])).toEqual({
      exitCode: 0,
      message: "The link already existed; nothing changed.",
    });
    expect(await run(["unlink", "t@example.com", "s@example.com"])).toEqual({
      exitCode: 0,
      message: "Removed the link.",
    });
    expect(await run(["unlink", "t@example.com", "s@example.com"])).toEqual({
      exitCode: 0,
      message: "There was no such link; nothing changed.",
    });
  });

  it("reports a rule violation or an unknown account as a failure", async () => {
    expect(await run(["link", "t@example.com", "s@example.com"])).toMatchObject({ exitCode: 1 });
    expect((await run(["link", "t@example.com", "s@example.com"])).message).toMatch(
      /not a teacher/,
    );
    expect(await run(["promote", "nobody@example.com"])).toEqual({
      exitCode: 1,
      message: "No user account has that email.",
    });
  });

  it("prints usage for a missing or unknown command or wrong arguments", async () => {
    for (const argv of [[], ["dance"], ["promote"], ["link", "only-one@example.com"]]) {
      expect(await run(argv)).toEqual({ exitCode: 2, message: TEACHER_ADMIN_USAGE });
    }
  });

  it("does not swallow unexpected errors", async () => {
    users.findByNormalizedEmail = () => Promise.reject(new Error("database down"));
    await expect(run(["promote", "t@example.com"])).rejects.toThrow("database down");
  });
});
