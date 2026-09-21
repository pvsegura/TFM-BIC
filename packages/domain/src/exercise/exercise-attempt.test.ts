import { describe, expect, it } from "vitest";

import { createExerciseId } from "./exercise-id.js";
import {
  EXERCISE_RESULT_STATUSES,
  resultStatusOf,
  summarizeAttempts,
  type ExerciseAttempt,
} from "./exercise-attempt.js";

const EXERCISE = createExerciseId("pl-greetings-polite-hello");
const OTHER = createExerciseId("pl-greetings-goodnight");

function attempt(id: number, correct: boolean, at: string, exerciseId = EXERCISE): ExerciseAttempt {
  return {
    id,
    userId: "user-1",
    exerciseId,
    submittedAnswer: "opt-a",
    correct,
    answeredAt: new Date(at),
  };
}

describe("resultStatusOf", () => {
  it("has three statuses, one of which is derived", () => {
    expect(EXERCISE_RESULT_STATUSES).toEqual(["unanswered", "correct", "incorrect"]);
  });

  it("is unanswered when there is no attempt at all", () => {
    expect(resultStatusOf(null)).toBe("unanswered");
  });

  it("follows the latest attempt", () => {
    const wrong = summarizeAttempts(EXERCISE, [attempt(1, false, "2026-01-01T10:00:00Z")]);
    const right = summarizeAttempts(EXERCISE, [attempt(1, true, "2026-01-01T10:00:00Z")]);

    expect(resultStatusOf(wrong)).toBe("incorrect");
    expect(resultStatusOf(right)).toBe("correct");
  });
});

describe("summarizeAttempts", () => {
  it("returns null when the student has not attempted the exercise", () => {
    expect(summarizeAttempts(EXERCISE, [])).toBeNull();
    expect(
      summarizeAttempts(EXERCISE, [attempt(1, true, "2026-01-01T10:00:00Z", OTHER)]),
    ).toBeNull();
  });

  it("counts every attempt and reports the latest one's correctness and time", () => {
    const summary = summarizeAttempts(EXERCISE, [
      attempt(1, false, "2026-01-01T10:00:00Z"),
      attempt(2, false, "2026-01-01T10:01:00Z"),
      attempt(3, true, "2026-01-01T10:02:00Z"),
    ]);

    expect(summary).toEqual({
      exerciseId: EXERCISE,
      attemptCount: 3,
      latestCorrect: true,
      latestAnsweredAt: new Date("2026-01-01T10:02:00Z"),
    });
  });

  it("does not let an earlier correct attempt hide a later incorrect one", () => {
    const summary = summarizeAttempts(EXERCISE, [
      attempt(1, true, "2026-01-01T10:00:00Z"),
      attempt(2, false, "2026-01-01T10:05:00Z"),
    ]);

    expect(summary?.latestCorrect).toBe(false);
    expect(summary?.attemptCount).toBe(2);
  });

  it("does not depend on the order the attempts are given in", () => {
    const summary = summarizeAttempts(EXERCISE, [
      attempt(3, true, "2026-01-01T10:02:00Z"),
      attempt(1, false, "2026-01-01T10:00:00Z"),
      attempt(2, false, "2026-01-01T10:01:00Z"),
    ]);

    expect(summary?.latestCorrect).toBe(true);
  });

  it("breaks a tie on the timestamp by the attempt id: the later insert is the latest", () => {
    const at = "2026-01-01T10:00:00Z";

    expect(
      summarizeAttempts(EXERCISE, [attempt(7, true, at), attempt(6, false, at)])?.latestCorrect,
    ).toBe(true);
    expect(
      summarizeAttempts(EXERCISE, [attempt(6, true, at), attempt(7, false, at)])?.latestCorrect,
    ).toBe(false);
  });

  it("only looks at the requested exercise", () => {
    const summary = summarizeAttempts(EXERCISE, [
      attempt(1, false, "2026-01-01T10:00:00Z"),
      attempt(2, true, "2026-01-01T10:09:00Z", OTHER),
    ]);

    expect(summary).toMatchObject({ attemptCount: 1, latestCorrect: false });
  });
});
