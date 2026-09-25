import type { TeacherStudentDetailResponse } from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as api from "../services/teacher-dashboard-api.js";
import { TeacherStudentPage } from "./teacher-student-page.js";

const ID = "7d9f1c1e-2f0a-4c55-9d0e-3d9b8f6a1b2c";

const week = (weekStart: string, attempts: number, correct: number, accuracy: number | null) => ({
  weekStart,
  lessonsCompleted: attempts > 0 ? 1 : 0,
  exerciseAttempts: attempts,
  correctAttempts: correct,
  accuracyPercent: accuracy,
  points: correct * 10,
});

const DETAIL: TeacherStudentDetailResponse = {
  student: {
    studentId: ID,
    displayName: "Ana Nowak",
    nickname: "ana",
    avatarId: "avatar-01",
    lessonsCompleted: 2,
    lessonsInProgress: 1,
    exerciseAttempts: 4,
    accuracyPercent: 75,
    points: 60,
    lastActivityAt: "2026-09-24T10:00:00.000Z",
    active: true,
  },
  lessons: {
    byLevel: [
      { languageId: "pl", levelId: "a1", completed: 2, inProgress: 1, publishedLessons: 4 },
    ],
    unmatched: 1,
    recent: [
      {
        lessonId: "pl-greetings",
        title: "Greetings",
        languageId: "pl",
        levelId: "a1",
        status: "completed",
        startedAt: "2026-09-20T10:00:00.000Z",
        completedAt: "2026-09-21T10:00:00.000Z",
        updatedAt: "2026-09-21T10:00:00.000Z",
      },
      {
        lessonId: "pl-retired",
        title: null,
        languageId: null,
        levelId: null,
        status: "in_progress",
        startedAt: "2026-09-19T10:00:00.000Z",
        completedAt: null,
        updatedAt: "2026-09-19T10:00:00.000Z",
      },
    ],
  },
  exercises: {
    attempts: 4,
    correctAttempts: 3,
    incorrectAttempts: 1,
    accuracyPercent: 75,
    exercisesAttempted: 2,
    exercisesLatestCorrect: 1,
    recent: [
      {
        exerciseId: "pl-greetings-tf",
        lessonId: "pl-greetings",
        lessonTitle: "Greetings",
        correct: false,
        answeredAt: "2026-09-24T10:00:00.000Z",
      },
    ],
  },
  gamification: {
    totalPoints: 60,
    achievements: { unlockedCount: 1, totalCount: 5 },
    unlocked: [
      {
        key: "first-exercise",
        title: "First exercise",
        iconId: "spark",
        unlockedAt: "2026-09-21T10:00:00.000Z",
      },
    ],
  },
  weekly: [
    week("2026-09-14T00:00:00.000Z", 0, 0, null),
    week("2026-09-21T00:00:00.000Z", 4, 3, 75),
  ],
};

function renderPage() {
  const Stub = createRoutesStub([
    { path: "/teacher/students/:studentId", Component: TeacherStudentPage },
    { path: "/teacher", Component: () => <p>Roster</p> },
  ]);
  return renderWithProviders(<Stub initialEntries={[`/teacher/students/${ID}`]} />);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TeacherStudentPage", () => {
  it("asks the API for exactly the student in the URL", async () => {
    const fetch = vi.spyOn(api, "fetchTeacherStudent").mockResolvedValue(DETAIL);
    renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Ana Nowak" })).toBeVisible();
    expect(fetch).toHaveBeenCalledWith(ID);
    expect(screen.getByText("Active")).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to your students" })).toHaveAttribute(
      "href",
      "/teacher",
    );
  });

  it("shows lesson progress per level with a labelled progress bar and words", async () => {
    vi.spyOn(api, "fetchTeacherStudent").mockResolvedValue(DETAIL);
    renderPage();

    const lessons = await screen.findByRole("region", { name: "Lessons" });
    expect(within(lessons).getByText("PL · A1")).toBeVisible();
    expect(
      within(lessons).getByText("2 of 4 published lessons completed · 1 in progress"),
    ).toBeVisible();
    expect(
      within(lessons).getByRole("progressbar", { name: "PL · A1 lessons completed" }),
    ).toHaveAttribute("value", "2");
    expect(
      within(lessons).getByText(/1 lesson record is for a lesson no longer in the catalog/),
    ).toBeVisible();
    expect(within(lessons).getByText("Greetings")).toBeVisible();
    expect(within(lessons).getByText("Lesson no longer available")).toBeVisible();
    expect(within(lessons).getByText("Completed")).toBeVisible();
    expect(within(lessons).getByText("In progress")).toBeVisible();
  });

  it("shows exercise performance with definitions and each verdict in words", async () => {
    vi.spyOn(api, "fetchTeacherStudent").mockResolvedValue(DETAIL);
    renderPage();

    const exercises = await screen.findByRole("region", { name: "Exercises" });
    expect(within(exercises).getByText("75%")).toBeVisible();
    expect(within(exercises).getByText("3 correct · 1 incorrect")).toBeVisible();
    expect(within(exercises).getByText("1 of 2")).toBeVisible();
    expect(within(exercises).getByText("Incorrect")).toBeVisible();
  });

  it("shows points and achievements from the ledger", async () => {
    vi.spyOn(api, "fetchTeacherStudent").mockResolvedValue(DETAIL);
    renderPage();

    const points = await screen.findByRole("region", { name: "Points and achievements" });
    expect(within(points).getByText("60")).toBeVisible();
    expect(within(points).getByText("1 of 5")).toBeVisible();
    expect(within(points).getByText("First exercise")).toBeVisible();
  });

  it("draws progress over time as a decorative chart with a data table for everyone", async () => {
    vi.spyOn(api, "fetchTeacherStudent").mockResolvedValue(DETAIL);
    renderPage();

    const progress = await screen.findByRole("region", { name: "Progress over time" });
    expect(progress.querySelector("[data-chart]")).toHaveAttribute("aria-hidden", "true");
    const table = within(progress).getByRole("table", { name: /Weekly activity/ });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(within(rows[2]!).getByText("75%")).toBeVisible();
    expect(within(rows[1]!).getByText("—")).toBeVisible();
  });

  it("treats another teacher's student like a missing one, without details", async () => {
    vi.spyOn(api, "fetchTeacherStudent").mockRejectedValue(new ApiError("Student not found.", 404));
    renderPage();

    expect(await screen.findByRole("heading", { name: "Student not found" })).toBeVisible();
    expect(
      screen.getByText("This student is not in your list, or the link is out of date."),
    ).toBeVisible();
  });

  it("shows a loading state and a retryable error", async () => {
    const fetch = vi
      .spyOn(api, "fetchTeacherStudent")
      .mockRejectedValueOnce(new ApiError("Internal Server Error", 500))
      .mockResolvedValue(DETAIL);
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText("Loading student…")).toBeVisible();
    await user.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Ana Nowak" })).toBeVisible();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps a clear heading hierarchy", async () => {
    vi.spyOn(api, "fetchTeacherStudent").mockResolvedValue(DETAIL);
    renderPage();

    await screen.findByRole("heading", { level: 1 });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Lessons",
      "Exercises",
      "Points and achievements",
      "Progress over time",
    ]);
  });
});
