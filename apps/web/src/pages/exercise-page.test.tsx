import type {
  ExerciseAnswerResponse,
  ExerciseListResponse,
  ExerciseResponse,
  LanguagesResponse,
} from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as authApi from "../services/auth-api.js";
import * as catalogApi from "../services/catalog-api.js";
import * as exercisesApi from "../services/exercises-api.js";
import { ExercisePage } from "./exercise-page.js";

const UNANSWERED = { status: "unanswered", attemptCount: 0, lastAnsweredAt: null } as const;

const BASE = {
  lessonId: "pl-greetings",
  languageId: "pl",
  levelId: "a1",
  instructionLanguage: "en",
  result: UNANSWERED,
};

const CHOICE = {
  ...BASE,
  id: "pl-greetings-polite-hello",
  type: "multiple-choice",
  order: 10,
  prompt: "Which greeting is polite?",
  options: [
    { id: "a", text: "Dzień dobry" },
    { id: "b", text: "Cześć" },
  ],
} as unknown as ExerciseResponse;

const TYPED = {
  ...BASE,
  id: "pl-greetings-good-night",
  type: "text-answer",
  order: 20,
  prompt: "Type the Polish for: Good night.",
} as unknown as ExerciseResponse;

function summaryOf(exercise: ExerciseResponse, status = "unanswered") {
  return {
    id: exercise.id,
    lessonId: exercise.lessonId,
    languageId: exercise.languageId,
    levelId: exercise.levelId,
    type: exercise.type,
    order: exercise.order,
    prompt: exercise.prompt,
    instructionLanguage: exercise.instructionLanguage,
    result: { ...UNANSWERED, status },
  };
}

function listOf(answered: number, statuses: [string, string] = ["unanswered", "unanswered"]) {
  return {
    exercises: [summaryOf(CHOICE, statuses[0]), summaryOf(TYPED, statuses[1])],
    progress: { total: 2, answered },
  } as unknown as ExerciseListResponse;
}

const LANGUAGES = {
  languages: [
    { code: "pl", name: "Polish", nativeName: "polski", locale: "pl-PL", direction: "ltr" },
  ],
} as unknown as LanguagesResponse;

const CORRECT: ExerciseAnswerResponse = {
  correct: true,
  feedback: "Dzień dobry is polite.",
  correctAnswer: "a",
  result: { status: "correct", attemptCount: 1, lastAnsweredAt: "2026-01-01T10:00:00.000Z" },
  rewards: { pointsAwarded: 0, achievementsUnlocked: [] },
};
const INCORRECT: ExerciseAnswerResponse = {
  correct: false,
  feedback: "Dzień dobry is polite.",
  correctAnswer: "a",
  result: { status: "incorrect", attemptCount: 1, lastAnsweredAt: "2026-01-01T10:00:00.000Z" },
  rewards: { pointsAwarded: 0, achievementsUnlocked: [] },
};

function renderAt(path: string) {
  const Stub = createRoutesStub([
    { path: "/learn/exercises/:exerciseId", Component: ExercisePage },
    { path: "/learn/lessons/:lessonId", Component: () => <p>Lesson page</p> },
    { path: "/learn/lessons", Component: () => <p>Lessons page</p> },
  ]);
  return renderWithProviders(<Stub initialEntries={[path]} />);
}

function mockApi(exercise = CHOICE, list = listOf(0)) {
  vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
  return {
    exercise: vi.spyOn(exercisesApi, "fetchExercise").mockResolvedValue(exercise),
    list: vi.spyOn(exercisesApi, "fetchLessonExercises").mockResolvedValue(list),
    submit: vi.spyOn(exercisesApi, "submitAnswer").mockResolvedValue(CORRECT),
  };
}

beforeEach(() => {
  vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ExercisePage: loading and errors (/learn/exercises/:exerciseId)", () => {
  it("asks for the exercise named in the address", async () => {
    const api = mockApi();
    renderAt("/learn/exercises/pl-greetings-polite-hello");

    await screen.findByRole("group", { name: "Which greeting is polite?" });

    expect(api.exercise).toHaveBeenCalledWith("pl-greetings-polite-hello");
  });

  it("says it is loading, under a level-one heading", () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
    vi.spyOn(exercisesApi, "fetchExercise").mockReturnValue(new Promise(() => undefined));
    renderAt("/learn/exercises/pl-greetings-polite-hello");

    expect(screen.getByRole("heading", { level: 1, name: "Exercise" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading exercise…");
  });

  it("shows a safe not-found, never echoing the id, when the exercise is not available", async () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
    vi.spyOn(exercisesApi, "fetchExercise").mockRejectedValue(
      new ApiError("Exercise not found.", 404),
    );
    renderAt("/learn/exercises/pl-draft-secret-exercise");

    expect(await screen.findByRole("heading", { name: "Exercise not found" })).toBeInTheDocument();
    expect(screen.getByText("That exercise is not available.")).toBeInTheDocument();
    expect(screen.queryByText(/pl-draft-secret-exercise/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to lessons" })).toHaveAttribute(
      "href",
      "/learn/lessons",
    );
  });

  it("treats a malformed id the same as a missing one", async () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
    vi.spyOn(exercisesApi, "fetchExercise").mockRejectedValue(
      new ApiError("Invalid request.", 400),
    );
    renderAt("/learn/exercises/..%2F..%2Fetc");

    expect(await screen.findByRole("heading", { name: "Exercise not found" })).toBeInTheDocument();
  });

  it("offers a retry when the exercise could not be loaded for another reason", async () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
    const load = vi
      .spyOn(exercisesApi, "fetchExercise")
      .mockRejectedValueOnce(new ApiError("Something went wrong. Please try again.", 500))
      .mockResolvedValueOnce(CHOICE);
    vi.spyOn(exercisesApi, "fetchLessonExercises").mockResolvedValue(listOf(0));
    renderAt("/learn/exercises/pl-greetings-polite-hello");
    const user = userEvent.setup();

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load this exercise");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("group", { name: "Which greeting is polite?" })).toBeVisible();
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("ExercisePage: answering", () => {
  it("shows the exercise's place in its lesson, taken from the lesson's list", async () => {
    mockApi();
    renderAt("/learn/exercises/pl-greetings-polite-hello");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Exercise 1 of 2" }),
    ).toBeInTheDocument();
  });

  it("requests the exercise's own lesson's list, and only that", async () => {
    const api = mockApi();
    renderAt("/learn/exercises/pl-greetings-polite-hello");
    await screen.findByRole("heading", { level: 1, name: "Exercise 1 of 2" });

    expect(api.list).toHaveBeenCalledExactlyOnceWith("pl-greetings");
  });

  it("does not show the answer before one is submitted", async () => {
    mockApi();
    renderAt("/learn/exercises/pl-greetings-polite-hello");
    await screen.findByRole("group", { name: "Which greeting is polite?" });

    expect(screen.queryByText(/Correct answer/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dzień dobry is polite/)).not.toBeInTheDocument();
  });

  it("sends the student's answer, and shows the server's verdict, correct answer and feedback", async () => {
    const api = mockApi();
    renderAt("/learn/exercises/pl-greetings-polite-hello");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("radio", { name: "Dzień dobry" }));
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    expect(api.submit).toHaveBeenCalledExactlyOnceWith("pl-greetings-polite-hello", "a");
    const status = await screen.findByText("Correct answer:", { exact: false });
    expect(status).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Correct");
    expect(screen.getByRole("status")).toHaveTextContent("Dzień dobry is polite.");
  });

  it("shows an incorrect verdict as the server gave it", async () => {
    const api = mockApi();
    api.submit.mockResolvedValue(INCORRECT);
    renderAt("/learn/exercises/pl-greetings-polite-hello");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("radio", { name: "Cześć" }));
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Not quite");
    });
    expect(screen.getByRole("status")).toHaveTextContent("Correct answer: Dzień dobry");
  });

  it("refreshes the lesson's list after an answer, so the next look shows what was persisted", async () => {
    const api = mockApi();
    renderAt("/learn/exercises/pl-greetings-polite-hello");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("radio", { name: "Dzień dobry" }));

    await user.click(screen.getByRole("button", { name: "Check answer" }));

    await waitFor(() => {
      expect(api.list).toHaveBeenCalledTimes(2);
    });
  });

  it("lets the student retry, and the retry is a second submission", async () => {
    const api = mockApi();
    api.submit.mockResolvedValueOnce(INCORRECT).mockResolvedValueOnce(CORRECT);
    renderAt("/learn/exercises/pl-greetings-polite-hello");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("radio", { name: "Cześć" }));
    await user.click(screen.getByRole("button", { name: "Check answer" }));
    await user.click(await screen.findByRole("button", { name: "Try again" }));
    await user.click(screen.getByRole("radio", { name: "Dzień dobry" }));
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Correct");
    });
    expect(api.submit).toHaveBeenNthCalledWith(1, "pl-greetings-polite-hello", "b");
    expect(api.submit).toHaveBeenNthCalledWith(2, "pl-greetings-polite-hello", "a");
  });

  it("does not send a second answer for a double-click", async () => {
    const api = mockApi();
    renderAt("/learn/exercises/pl-greetings-polite-hello");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("radio", { name: "Dzień dobry" }));

    await user.dblClick(screen.getByRole("button", { name: "Check answer" }));

    await screen.findByText("Correct answer:", { exact: false });
    expect(api.submit).toHaveBeenCalledTimes(1);
  });

  it("says so, and keeps the exercise usable, when the answer could not be checked", async () => {
    const api = mockApi();
    api.submit.mockRejectedValueOnce(new ApiError("Something went wrong. Please try again.", 500));
    renderAt("/learn/exercises/pl-greetings-polite-hello");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("radio", { name: "Dzień dobry" }));
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't check your answer");
    expect(screen.getByRole("button", { name: "Check answer" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "Dzień dobry" })).toBeChecked();
  });

  it("tags the text box with the locale and direction from the catalog", async () => {
    mockApi(TYPED);
    renderAt("/learn/exercises/pl-greetings-good-night");

    const input = await screen.findByLabelText("Type the Polish for: Good night.");
    await waitFor(() => {
      expect(input).toHaveAttribute("lang", "pl-PL");
    });
    expect(input).toHaveAttribute("dir", "ltr");
  });
});

describe("ExercisePage: moving on", () => {
  it("links to the next exercise of the lesson after an answer", async () => {
    mockApi();
    renderAt("/learn/exercises/pl-greetings-polite-hello");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("radio", { name: "Dzień dobry" }));
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    expect(await screen.findByRole("link", { name: "Next exercise" })).toHaveAttribute(
      "href",
      "/learn/exercises/pl-greetings-good-night",
    );
  });

  it("has no next exercise after the last one, and says when the whole lesson has been answered", async () => {
    const api = mockApi(TYPED, listOf(2, ["correct", "correct"]));
    api.submit.mockResolvedValue({
      ...CORRECT,
      correctAnswer: "Dobranoc",
      feedback: null,
    });
    renderAt("/learn/exercises/pl-greetings-good-night");
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("Type the Polish for: Good night."), "Dobranoc");
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    expect(
      await screen.findByText("You have answered every exercise in this lesson."),
    ).toBeVisible();
    expect(screen.queryByRole("link", { name: "Next exercise" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to lesson" })).toHaveAttribute(
      "href",
      "/learn/lessons/pl-greetings",
    );
  });

  it("does not claim the lesson is finished while some exercises are still unanswered", async () => {
    mockApi();
    renderAt("/learn/exercises/pl-greetings-polite-hello");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("radio", { name: "Dzień dobry" }));
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    await screen.findByRole("link", { name: "Next exercise" });
    expect(screen.queryByText(/answered every exercise/)).not.toBeInTheDocument();
  });

  it("starts the next exercise fresh: no verdict or selection carried over from this one", async () => {
    const api = mockApi();
    api.exercise.mockImplementation((id: string) =>
      Promise.resolve(id === TYPED.id ? TYPED : CHOICE),
    );
    const Stub = createRoutesStub([
      { path: "/learn/exercises/:exerciseId", Component: ExercisePage },
    ]);
    renderWithProviders(<Stub initialEntries={["/learn/exercises/pl-greetings-polite-hello"]} />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("radio", { name: "Dzień dobry" }));
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    await user.click(await screen.findByRole("link", { name: "Next exercise" }));

    expect(await screen.findByLabelText("Type the Polish for: Good night.")).toBeEnabled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("goes back to the lesson", async () => {
    mockApi();
    renderAt("/learn/exercises/pl-greetings-polite-hello");

    expect(await screen.findByRole("link", { name: "Back to lesson" })).toHaveAttribute(
      "href",
      "/learn/lessons/pl-greetings",
    );
  });

  it("still works when the lesson's list cannot be loaded: it just does not know its place", async () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
    vi.spyOn(exercisesApi, "fetchExercise").mockResolvedValue(CHOICE);
    vi.spyOn(exercisesApi, "fetchLessonExercises").mockRejectedValue(
      new ApiError("Something went wrong. Please try again.", 500),
    );
    renderAt("/learn/exercises/pl-greetings-polite-hello");

    expect(await screen.findByRole("group", { name: "Which greeting is polite?" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 1, name: "Exercise" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
