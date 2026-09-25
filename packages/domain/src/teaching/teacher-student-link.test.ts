import { describe, expect, it } from "vitest";

import { InvalidTeacherStudentLinkError } from "./errors/invalid-teacher-student-link.error.js";
import { assertCanLink, canAccessTeacherDashboard } from "./teacher-student-link.js";

const teacher = { id: "11111111-1111-4111-8111-111111111111", role: "TEACHER" as const };
const student = { id: "22222222-2222-4222-8222-222222222222", role: "STUDENT" as const };

describe("assertCanLink", () => {
  it("accepts a teacher and a student", () => {
    expect(() => assertCanLink(teacher, student)).not.toThrow();
  });

  it("refuses when the would-be teacher is not a TEACHER", () => {
    const notATeacher = { ...teacher, role: "STUDENT" as const };
    expect(() => assertCanLink(notATeacher, student)).toThrow(InvalidTeacherStudentLinkError);
    expect(() => assertCanLink(notATeacher, student)).toThrow(/not a teacher/);
  });

  it("refuses when the would-be student is not a STUDENT (a teacher cannot be anyone's student)", () => {
    const anotherTeacher = { ...student, role: "TEACHER" as const };
    expect(() => assertCanLink(teacher, anotherTeacher)).toThrow(/not a student/);
  });

  it("refuses to link a user to themselves", () => {
    expect(() => assertCanLink(teacher, { ...teacher, role: "STUDENT" })).toThrow(/themselves/);
  });
});

describe("canAccessTeacherDashboard", () => {
  it("is true only for the TEACHER role", () => {
    expect(canAccessTeacherDashboard("TEACHER")).toBe(true);
    expect(canAccessTeacherDashboard("STUDENT")).toBe(false);
  });
});
