import type { LanguagesResponse, LessonProgressResponse, LessonResponse } from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { createRoutesStub } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as authApi from "../services/auth-api.js";
import * as catalogApi from "../services/catalog-api.js";
import * as lessonsApi from "../services/lessons-api.js";
import { LessonPage } from "./lesson-page.js";

const NOT_STARTED: LessonProgressResponse = {
  status: "not_started",
  startedAt: null,
  completedAt: null,
};
const IN_PROGRESS: LessonProgressResponse = {
  status: "in_progress",
  startedAt: "2026-01-01T10:00:00.000Z",
  completedAt: null,
};
const COMPLETED: LessonProgressResponse = {
  status: "completed",
  startedAt: "2026-01-01T10:00:00.000Z",
  completedAt: "2026-01-01T10:05:00.000Z",
};

function lesson(progress: LessonProgressResponse = NOT_STARTED) {
  return {
    id: "pl-greetings",
    languageId: "pl",
    levelId: "a1",
    title: "Greetings and goodbyes",
    description: "Say hello.",
    order: 10,
    instructionLanguage: "en",
    progress,
    blocks: [
      { type: "explanation", text: "Polish has formal and informal greetings." },
      { type: "example", text: "Cześć!", translation: "Hi!", note: "Informal." },
      { type: "dialogue", lines: [{ speaker: "Anna", text: "Cześć!", translation: "Hi!" }] },
    ],
  } as unknown as LessonResponse;
}

const LANGUAGES = {
  languages: [
    { code: "pl", name: "Polish", nativeName: "polski", locale: "pl-PL", direction: "ltr" },
  ],
} as unknown as LanguagesResponse;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderAt(path: string, { strict = false } = {}) {
  const Stub = createRoutesStub([
    { path: "/learn/lessons/:lessonId", Component: LessonPage },
    { path: "/learn/lessons", Component: () => <p>Lessons page</p> },
  ]);
  const ui = <Stub initialEntries={[path]} />;
  return renderWithProviders(strict ? <StrictMode>{ui}</StrictMode> : ui);
}

function mockApi(initial: LessonProgressResponse = NOT_STARTED) {
  vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
  return {
    lesson: vi.spyOn(lessonsApi, "fetchLesson").mockResolvedValue(lesson(initial)),
    start: vi.spyOn(lessonsApi, "startLesson").mockResolvedValue(IN_PROGRESS),
    complete: vi.spyOn(lessonsApi, "completeLesson").mockResolvedValue(COMPLETED),
  };
}

beforeEach(() => {
  vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LessonPage: showing the lesson (/learn/lessons/:lessonId)", () => {
  it("renders the lesson's title, description and every block through the safe block components", async () => {
    mockApi(IN_PROGRESS);
    renderAt("/learn/lessons/pl-greetings");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Greetings and goodbyes" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Say hello.")).toBeInTheDocument();
    expect(screen.getByText("Polish has formal and informal greetings.")).toBeInTheDocument();
    expect(screen.getAllByText("Cześć!").length).toBeGreaterThan(0);
    expect(screen.getByText("Informal.")).toBeInTheDocument();
    expect(screen.getByText("Anna")).toBeInTheDocument();
  });

  it("requests the lesson named in the address", async () => {
    const api = mockApi(IN_PROGRESS);
    renderAt("/learn/lessons/pl-greetings");
    await screen.findByRole("heading", { level: 1, name: "Greetings and goodbyes" });

    expect(api.lesson).toHaveBeenCalledWith("pl-greetings");
  });

  it("tags the learned-language text with the locale and direction from the catalog", async () => {
    mockApi(IN_PROGRESS);
    renderAt("/learn/lessons/pl-greetings");
    await screen.findByRole("heading", { level: 1, name: "Greetings and goodbyes" });

    await waitFor(() => {
      expect(screen.getAllByText("Cześć!")[0]).toHaveAttribute("lang", "pl-PL");
    });
    expect(screen.getAllByText("Cześć!")[0]).toHaveAttribute("dir", "ltr");
  });

  it("still shows the lesson if the language catalog cannot be loaded", async () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockRejectedValue(new ApiError("boom", 500));
    vi.spyOn(lessonsApi, "fetchLesson").mockResolvedValue(lesson(IN_PROGRESS));
    renderAt("/learn/lessons/pl-greetings");

    expect(
      await screen.findByText("Polish has formal and informal greetings."),
    ).toBeInTheDocument();
  });

  it("links back to the lessons of the lesson's own language and level", async () => {
    mockApi(IN_PROGRESS);
    renderAt("/learn/lessons/pl-greetings");

    expect(await screen.findByRole("link", { name: "Back to lessons" })).toHaveAttribute(
      "href",
      "/learn/lessons?language=pl&level=a1",
    );
  });

  it("shows a loading message, not a missing lesson, while the lesson loads", () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
    vi.spyOn(lessonsApi, "fetchLesson").mockReturnValue(new Promise(() => undefined));
    renderAt("/learn/lessons/pl-greetings");

    expect(screen.getByRole("status")).toHaveTextContent("Loading lesson…");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
  });
});

describe("LessonPage: opening starts the lesson", () => {
  it("records that the student opened a lesson they had not started, once", async () => {
    const api = mockApi(NOT_STARTED);
    renderAt("/learn/lessons/pl-greetings");

    await waitFor(() => {
      expect(api.start).toHaveBeenCalledWith("pl-greetings");
    });
    expect(api.start).toHaveBeenCalledTimes(1);
  });

  it("does so once even when React runs effects twice (StrictMode)", async () => {
    const api = mockApi(NOT_STARTED);
    renderAt("/learn/lessons/pl-greetings", { strict: true });
    await screen.findByRole("heading", { level: 1, name: "Greetings and goodbyes" });

    await waitFor(() => {
      expect(api.start).toHaveBeenCalled();
    });
    expect(api.start).toHaveBeenCalledTimes(1);
  });

  it("shows the state the server persisted once it has started", async () => {
    mockApi(NOT_STARTED);
    renderAt("/learn/lessons/pl-greetings");

    expect(await screen.findByText("In progress")).toBeVisible();
  });

  it.each([
    ["in progress", IN_PROGRESS],
    ["completed", COMPLETED],
  ])("does not start a lesson that is already %s", async (_name, progress) => {
    const api = mockApi(progress);
    renderAt("/learn/lessons/pl-greetings");
    await screen.findByRole("heading", { level: 1, name: "Greetings and goodbyes" });

    expect(api.start).not.toHaveBeenCalled();
  });

  it("does not complete the lesson by opening it", async () => {
    const api = mockApi(NOT_STARTED);
    renderAt("/learn/lessons/pl-greetings");
    await screen.findByRole("heading", { level: 1, name: "Greetings and goodbyes" });

    expect(api.complete).not.toHaveBeenCalled();
  });

  it("keeps the lesson readable, with no error, when recording the start fails", async () => {
    const api = mockApi(NOT_STARTED);
    api.start.mockRejectedValue(new ApiError("Something went wrong. Please try again.", 500));
    renderAt("/learn/lessons/pl-greetings");

    expect(await screen.findByText("Polish has formal and informal greetings.")).toBeVisible();
    await waitFor(() => {
      expect(api.start).toHaveBeenCalled();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("LessonPage: completing", () => {
  it("completes only when the student uses the button, then confirms and keeps the content", async () => {
    const user = userEvent.setup();
    const api = mockApi(IN_PROGRESS);
    renderAt("/learn/lessons/pl-greetings");
    await screen.findByRole("heading", { level: 1, name: "Greetings and goodbyes" });
    expect(api.complete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Complete lesson" }));

    expect(api.complete).toHaveBeenCalledWith("pl-greetings");
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Lesson completed");
    });
    expect(screen.queryByRole("button", { name: "Complete lesson" })).not.toBeInTheDocument();
    expect(screen.getByText("Polish has formal and informal greetings.")).toBeVisible();
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
  });

  it("disables the button while saving so the request cannot be sent twice", async () => {
    const user = userEvent.setup();
    const api = mockApi(IN_PROGRESS);
    const pending = deferred<LessonProgressResponse>();
    api.complete.mockReturnValue(pending.promise);
    renderAt("/learn/lessons/pl-greetings");
    await screen.findByRole("heading", { level: 1, name: "Greetings and goodbyes" });

    await user.click(screen.getByRole("button", { name: "Complete lesson" }));
    const saving = await screen.findByRole("button", { name: "Completing…" });
    await user.click(saving);
    await user.dblClick(saving);

    expect(saving).toBeDisabled();
    expect(api.complete).toHaveBeenCalledTimes(1);
    pending.resolve(COMPLETED);
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Lesson completed");
    });
  });

  it("shows an alert when saving fails, keeps the lesson not completed, and allows a retry", async () => {
    const user = userEvent.setup();
    const api = mockApi(IN_PROGRESS);
    api.complete.mockRejectedValueOnce(
      new ApiError("Something went wrong. Please try again.", 500),
    );
    renderAt("/learn/lessons/pl-greetings");
    await screen.findByRole("heading", { level: 1, name: "Greetings and goodbyes" });

    await user.click(screen.getByRole("button", { name: "Complete lesson" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't save your progress. Please try again.",
    );
    expect(screen.queryByText(/Lesson completed/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Complete lesson" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Lesson completed");
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not show the server's error text to the student", async () => {
    const user = userEvent.setup();
    const api = mockApi(IN_PROGRESS);
    api.complete.mockRejectedValue(new ApiError("Lesson not found.", 404));
    renderAt("/learn/lessons/pl-greetings");
    await screen.findByRole("heading", { level: 1, name: "Greetings and goodbyes" });

    await user.click(screen.getByRole("button", { name: "Complete lesson" }));

    expect(await screen.findByRole("alert")).not.toHaveTextContent("Lesson not found.");
  });

  it("opens an already completed lesson as completed, with no completion button", async () => {
    mockApi(COMPLETED);
    renderAt("/learn/lessons/pl-greetings");

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Lesson completed");
    });
    expect(screen.queryByRole("button", { name: "Complete lesson" })).not.toBeInTheDocument();
  });
});

describe("LessonPage: not found and errors", () => {
  it.each([
    ["not found", 404],
    ["a malformed id", 400],
  ])("shows a safe not-found state for %s, with a way back", async (_name, status) => {
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
    vi.spyOn(lessonsApi, "fetchLesson").mockRejectedValue(
      new ApiError("Lesson not found.", status),
    );
    renderAt("/learn/lessons/whatever");

    expect(await screen.findByText("Lesson not found")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to lessons" })).toHaveAttribute(
      "href",
      "/learn/lessons",
    );
  });

  it("never echoes the requested id when the lesson is not found", async () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
    vi.spyOn(lessonsApi, "fetchLesson").mockRejectedValue(new ApiError("Lesson not found.", 404));
    renderAt("/learn/lessons/secret-draft-lesson");

    await screen.findByText("Lesson not found");

    expect(screen.queryByText(/secret-draft-lesson/)).not.toBeInTheDocument();
  });

  it("does not try to start or complete a lesson it could not load", async () => {
    const api = mockApi();
    api.lesson.mockRejectedValue(new ApiError("Lesson not found.", 404));
    renderAt("/learn/lessons/pl-greetings");
    await screen.findByText("Lesson not found");

    expect(api.start).not.toHaveBeenCalled();
    expect(api.complete).not.toHaveBeenCalled();
  });

  it("shows an error with a retry for a failure that is worth retrying", async () => {
    const user = userEvent.setup();
    const api = mockApi(IN_PROGRESS);
    api.lesson.mockRejectedValueOnce(new ApiError("Something went wrong. Please try again.", 500));
    renderAt("/learn/lessons/pl-greetings");

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this lesson");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Greetings and goodbyes" }),
    ).toBeInTheDocument();
    expect(api.lesson).toHaveBeenCalledTimes(2);
  });
});
