import { accuracyPercent, isActiveStudent, type Role } from "@tfm-bic/domain";

import type { RosterStudentRecord } from "./ports/teacher-dashboard-read-model.js";

/** Who is asking. Always the authenticated session's user — never anything from the request. */
export interface TeachingViewer {
  readonly id: string;
  readonly role: Role;
}

/** A student as a teacher sees them in a list. Every derived value is computed here, never in React. */
export interface RosterStudentView {
  studentId: string;
  /** "First Last" when the student entered a name, otherwise the nickname; `null` if neither. */
  displayName: string | null;
  nickname: string | null;
  avatarId: string | null;
  lessonsCompleted: number;
  lessonsInProgress: number;
  exerciseAttempts: number;
  accuracyPercent: number | null;
  points: number;
  lastActivityAt: Date | null;
  active: boolean;
}

export function displayNameOf(record: RosterStudentRecord): string | null {
  const fullName = [record.firstName, record.lastName].filter((part) => part !== null).join(" ");
  return fullName === "" ? record.nickname : fullName;
}

export function toRosterStudentView(record: RosterStudentRecord, now: Date): RosterStudentView {
  return {
    studentId: record.studentId,
    displayName: displayNameOf(record),
    nickname: record.nickname,
    avatarId: record.avatarId,
    lessonsCompleted: record.lessonsCompleted,
    lessonsInProgress: record.lessonsInProgress,
    exerciseAttempts: record.exerciseAttempts,
    accuracyPercent: accuracyPercent(record.correctAttempts, record.exerciseAttempts),
    points: record.points,
    lastActivityAt: record.lastActivityAt,
    active: isActiveStudent(record.lastActivityAt, now),
  };
}
