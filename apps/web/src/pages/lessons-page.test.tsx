import type {
  LanguageLevelsResponse,
  LanguagesResponse,
  LessonListResponse,
} from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as authApi from "../services/auth-api.js";
import * as catalogApi from "../services/catalog-api.js";
import * as lessonsApi from "../services/lessons-api.js";
import { LessonsPage } from "./lessons-page.js";

const POLISH = {
  code: "pl",
  name: "Polish",
  nativeName: "polski",
  locale: "pl-PL",
  direction: "ltr",
} as const;
const FICTIONAL = {
  code: "xx",
  name: "Testlandic",
  nativeName: "Testlandisch",
  locale: "xx",
  direction: "rtl",
} as const;

const LANGUAGES = { languages: [POLISH, FICTIONAL] } as unknown as LanguagesResponse;

const POLISH_LEVELS = {
  language: POLISH,
  levels: [
    { id: "a1", label: "A1", status: "available" },
    { id: "a2", label: "A2", status: "planned" },
  ],
} as unknown as LanguageLevelsResponse;

const NOT_STARTED = { status: "not_started", startedAt: null, completedAt: null };

function summary(id: string, title: string, progress: object = NOT_STARTED) {
  return {
    id,
    languageId: "pl",
    levelId: "a1",
    title,
    description: `About ${title}.`,
    order: 10,
    instructionLanguage: "en",
    progress,
  };
}

const POLISH_A1 = {
  lessons: [
    summary("pl-greetings", "Greetings and goodbyes", {
      status: "completed",
      startedAt: "2026-01-01T10:00:00.000Z",
      completedAt: "2026-01-01T10:05:00.000Z",
    }),
    summary("pl-introducing-yourself", "Introducing yourself", {
      status: "in_progress",
      startedAt: "2026-01-01T10:00:00.000Z",
      completedAt: null,
    }),
    summary("pl-polite-words", "Please, thank you and sorry"),
  ],
} as unknown as LessonListResponse;

function mockApi() {
  return {
    languages: vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES),
    levels: vi.spyOn(catalogApi, "fetchLanguageLevels").mockImplementation((code) => {
      if (code === "pl") return Promise.resolve(POLISH_LEVELS);
      if (code === "xx") {
        return Promise.resolve({
          language: FICTIONAL,
          levels: [{ id: "a1", label: "A1", status: "available" }],
        } as unknown as LanguageLevelsResponse);
      }
      return Promise.reject(new ApiError("Language not found.", 404));
    }),
    lessons: vi.spyOn(lessonsApi, "fetchLessons").mockImplementation((language) =>
      Promise.resolve(
        language === "pl"
          ? POLISH_A1
          : ({
              lessons: [{ ...summary("xx-only", "Only lesson"), languageId: "xx" }],
            } as unknown as LessonListResponse),
      ),
    ),
  };
}

function renderAt(path: string) {
  const Stub = createRoutesStub([
    { path: "/learn/lessons", Component: LessonsPage },
    { path: "/learn/lessons/:lessonId", Component: () => <p>Lesson page</p> },
  ]);
  return renderWithProviders(<Stub initialEntries={[path]} />);
}

beforeEach(() => {
  vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LessonsPage: language (/learn/lessons)", () => {
  it("has one level-one heading and lists the catalog's languages, linking within the lessons page", async () => {
    mockApi();
    renderAt("/learn/lessons");

    const polish = await screen.findByRole("link", { name: /Polish/ });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Lessons");
    expect(polish).toHaveAttribute("href", "/learn/lessons?language=pl");
    expect(screen.getByRole("link", { name: /Testlandic/ })).toBeInTheDocument();
  });

  it("asks for no lessons until a level is chosen", async () => {
    const api = mockApi();
    renderAt("/learn/lessons");
    await screen.findByRole("link", { name: /Polish/ });

    expect(api.lessons).not.toHaveBeenCalled();
    expect(api.levels).not.toHaveBeenCalled();
  });

  it("shows a loading message, not an empty one, while languages load", () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockReturnValue(new Promise(() => undefined));
    renderAt("/learn/lessons");

    expect(screen.getByRole("status")).toHaveTextContent("Loading languages…");
    expect(screen.queryByText(/no languages/i)).not.toBeInTheDocument();
  });
});

describe("LessonsPage: level (/learn/lessons?language=pl)", () => {
  it("offers the language's levels, linking with both choices in the query, and keeps planned levels unselectable", async () => {
    mockApi();
    renderAt("/learn/lessons?language=pl");

    const levels = await screen.findByRole("navigation", { name: "Levels" });
    expect(within(levels).getByRole("link", { name: "A1" })).toHaveAttribute(
      "href",
      "/learn/lessons?language=pl&level=a1",
    );
    expect(within(levels).getAllByRole("link")).toHaveLength(1);
    expect(within(levels).getByText("Coming soon")).toBeInTheDocument();
  });

  it("says a language that does not exist is not available", async () => {
    mockApi();
    renderAt("/learn/lessons?language=zz");

    expect(await screen.findByText("Language not found")).toBeInTheDocument();
  });

  it("treats a markup-looking language as not found, and shows it as nothing but text", async () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
    vi.spyOn(catalogApi, "fetchLanguageLevels").mockRejectedValue(new ApiError("Invalid", 400));
    renderAt(`/learn/lessons?language=${encodeURIComponent("<script>alert(1)</script>")}`);

    expect(await screen.findByText("Language not found")).toBeInTheDocument();
    expect(document.querySelector("main script, script[src]")).toBeNull();
  });
});

describe("LessonsPage: lessons (/learn/lessons?language=pl&level=a1)", () => {
  it("lists the lessons for that language and level with their state, in the order the API gave", async () => {
    const api = mockApi();
    renderAt("/learn/lessons?language=pl&level=a1");

    const list = await screen.findByRole("list", { name: "Lessons" });
    const cards = within(list).getAllByRole("listitem");
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent("Greetings and goodbyes");
    expect(cards[0]).toHaveTextContent("Completed");
    expect(cards[1]).toHaveTextContent("In progress");
    expect(cards[2]).toHaveTextContent("Not started");
    expect(api.lessons).toHaveBeenCalledWith("pl", "a1");
  });

  it("links each lesson to its page and gives each an action named after the lesson", async () => {
    mockApi();
    renderAt("/learn/lessons?language=pl&level=a1");

    expect(
      await screen.findByRole("link", { name: "Review lesson: Greetings and goodbyes" }),
    ).toHaveAttribute("href", "/learn/lessons/pl-greetings");
    expect(
      screen.getByRole("link", { name: "Continue lesson: Introducing yourself" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Start lesson: Please, thank you and sorry" }),
    ).toBeInTheDocument();
  });

  it("opens a lesson from its action", async () => {
    const user = userEvent.setup();
    mockApi();
    renderAt("/learn/lessons?language=pl&level=a1");

    await user.click(await screen.findByRole("link", { name: /Start lesson/ }));

    expect(await screen.findByText("Lesson page")).toBeInTheDocument();
  });

  it("shows a loading message, not an empty one, while the lessons load", async () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
    vi.spyOn(catalogApi, "fetchLanguageLevels").mockResolvedValue(POLISH_LEVELS);
    vi.spyOn(lessonsApi, "fetchLessons").mockReturnValue(new Promise(() => undefined));
    renderAt("/learn/lessons?language=pl&level=a1");

    expect(await screen.findByText("Loading lessons…")).toBeInTheDocument();
    expect(screen.queryByText(/no lessons/i)).not.toBeInTheDocument();
  });

  it("says so when a level has no lessons yet", async () => {
    mockApi();
    vi.spyOn(lessonsApi, "fetchLessons").mockResolvedValue({
      lessons: [],
    });
    renderAt("/learn/lessons?language=pl&level=a1");

    expect(await screen.findByText("No lessons are available for this level yet.")).toBeVisible();
  });

  it("shows an error with a retry, and loads again when the student retries", async () => {
    const user = userEvent.setup();
    const api = mockApi();
    api.lessons.mockRejectedValueOnce(new ApiError("Something went wrong. Please try again.", 500));
    renderAt("/learn/lessons?language=pl&level=a1");

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load the lessons");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("list", { name: "Lessons" })).toBeInTheDocument();
    expect(api.lessons).toHaveBeenCalledTimes(2);
  });

  it("does not show internals from a failed request", async () => {
    mockApi();
    vi.spyOn(lessonsApi, "fetchLessons").mockRejectedValue(
      new ApiError("Something went wrong. Please try again.", 500),
    );
    renderAt("/learn/lessons?language=pl&level=a1");

    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent(/sql|stack|postgres|error:/i);
  });

  it("does not request lessons for a planned level, and says it is coming soon", async () => {
    const api = mockApi();
    renderAt("/learn/lessons?language=pl&level=a2");

    expect(await screen.findByText(/A2 is coming soon for Polish/)).toBeInTheDocument();
    expect(api.lessons).not.toHaveBeenCalled();
  });

  it("says a level the language does not offer is not found", async () => {
    mockApi();
    renderAt("/learn/lessons?language=pl&level=c2");

    expect(await screen.findByText("Level not found")).toBeInTheDocument();
  });

  it("works unchanged for another language: nothing here is specific to Polish", async () => {
    const api = mockApi();
    renderAt("/learn/lessons?language=xx&level=a1");

    expect(await screen.findByRole("link", { name: "Start lesson: Only lesson" })).toHaveAttribute(
      "href",
      "/learn/lessons/xx-only",
    );
    expect(api.lessons).toHaveBeenCalledWith("xx", "a1");
  });

  it("keeps a clear heading hierarchy: h1 page, h2 sections, h3 lessons", async () => {
    mockApi();
    renderAt("/learn/lessons?language=pl&level=a1");
    await screen.findByRole("list", { name: "Lessons" });

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 }).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });
});
