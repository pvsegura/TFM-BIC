import type { ExerciseListResponse } from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as exercisesApi from "../services/exercises-api.js";
import { LessonExercises } from "./lesson-exercises.js";

function list(answered: number, statuses: string[]): ExerciseListResponse {
  return {
    exercises: statuses.map((status, index) => ({
      id: `pl-greetings-${String(index)}`,
      lessonId: "pl-greetings",
      languageId: "pl",
      levelId: "a1",
      type: "true-false",
      order: (index + 1) * 10,
      prompt: `Statement ${String(index + 1)}`,
      instructionLanguage: "en",
      result: {
        status,
        attemptCount: status === "unanswered" ? 0 : 1,
        lastAnsweredAt: status === "unanswered" ? null : "2026-01-01T10:00:00.000Z",
      },
    })),
    progress: { total: statuses.length, answered },
  } as unknown as ExerciseListResponse;
}

function renderSection() {
  return renderWithProviders(
    <MemoryRouter>
      <LessonExercises lessonId="pl-greetings" />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LessonExercises", () => {
  it("asks for this lesson's exercises only", async () => {
    const fetchList = vi
      .spyOn(exercisesApi, "fetchLessonExercises")
      .mockResolvedValue(list(0, ["unanswered"]));
    renderSection();

    await screen.findByRole("list", { name: "Exercises" });

    expect(fetchList).toHaveBeenCalledExactlyOnceWith("pl-greetings");
  });

  it("shows a Practice section with how many exercises have been answered, and the list", async () => {
    vi.spyOn(exercisesApi, "fetchLessonExercises").mockResolvedValue(
      list(1, ["correct", "unanswered", "unanswered"]),
    );
    renderSection();

    expect(await screen.findByRole("heading", { level: 2, name: "Practice" })).toBeInTheDocument();
    expect(screen.getByText("1 of 3 exercises answered")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("links each exercise to its own page under /learn/exercises", async () => {
    vi.spyOn(exercisesApi, "fetchLessonExercises").mockResolvedValue(list(0, ["unanswered"]));
    renderSection();

    expect(await screen.findByRole("link", { name: "Start exercise 1" })).toHaveAttribute(
      "href",
      "/learn/exercises/pl-greetings-0",
    );
  });

  it("says so when every exercise has been answered", async () => {
    vi.spyOn(exercisesApi, "fetchLessonExercises").mockResolvedValue(
      list(2, ["correct", "incorrect"]),
    );
    renderSection();

    expect(await screen.findByText("You have answered every exercise.")).toBeInTheDocument();
  });

  it("shows nothing at all for a lesson with no exercises: no empty heading", async () => {
    vi.spyOn(exercisesApi, "fetchLessonExercises").mockResolvedValue(list(0, []));
    const { container } = renderSection();

    await vi.waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    expect(container).toBeEmptyDOMElement();
  });

  it("says it is loading", () => {
    vi.spyOn(exercisesApi, "fetchLessonExercises").mockReturnValue(new Promise(() => undefined));
    renderSection();

    expect(screen.getByRole("status")).toHaveTextContent("Loading exercises…");
  });

  it("reports a failure to load, without hiding the lesson, and can try again", async () => {
    const fetchList = vi
      .spyOn(exercisesApi, "fetchLessonExercises")
      .mockRejectedValueOnce(new ApiError("Something went wrong. Please try again.", 500))
      .mockResolvedValueOnce(list(0, ["unanswered"]));
    renderSection();
    const user = userEvent.setup();

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load the exercises");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("list", { name: "Exercises" })).toBeInTheDocument();
    expect(fetchList).toHaveBeenCalledTimes(2);
  });
});
