import type {
  ContentListResponse,
  LanguageLevelsResponse,
  LanguagesResponse,
} from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RootLayout } from "../layouts/root-layout.js";
import { ApiError } from "../services/api-error.js";
import * as authApi from "../services/auth-api.js";
import * as catalogApi from "../services/catalog-api.js";
import { useThemeStore } from "../state/theme-store.js";
import { LearnPage } from "./learn-page.js";

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
    { id: "b1", label: "B1", status: "planned" },
  ],
} as unknown as LanguageLevelsResponse;

const POLISH_A1 = {
  items: [
    {
      id: "pl-greetings",
      languageId: "pl",
      levelId: "a1",
      type: "lesson",
      title: "Greetings and goodbyes",
      description: "Say hello.",
      order: 10,
      instructionLanguage: "en",
    },
    {
      id: "pl-no-articles",
      languageId: "pl",
      levelId: "a1",
      type: "explanation",
      title: "Polish has no articles",
      description: "Why there is no word for the.",
      order: 40,
      instructionLanguage: "en",
    },
  ],
} as unknown as ContentListResponse;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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
    content: vi.spyOn(catalogApi, "fetchContentList").mockImplementation((language) =>
      Promise.resolve(
        language === "pl"
          ? POLISH_A1
          : ({
              items: [
                {
                  id: "xx-only",
                  languageId: "xx",
                  levelId: "a1",
                  type: "lesson",
                  title: "Only item",
                  description: "Fictional.",
                  order: 1,
                  instructionLanguage: "en",
                },
              ],
            } as unknown as ContentListResponse),
      ),
    ),
  };
}

function renderAt(path: string) {
  const Stub = createRoutesStub([
    { path: "/learn/:languageCode?/:levelId?", Component: LearnPage },
    { path: "/learn/:languageCode/:levelId/:contentId", Component: () => <p>Detail page</p> },
  ]);
  return renderWithProviders(<Stub initialEntries={[path]} />);
}

beforeEach(() => {
  vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LearnPage: language discovery (/learn)", () => {
  it("shows the available languages from the catalog, with their native names", async () => {
    mockApi();
    renderAt("/learn");

    const polish = await screen.findByRole("link", { name: /Polish/ });
    expect(polish).toHaveAccessibleName(/polski/);
    expect(polish).toHaveAttribute("href", "/learn/pl");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("offers a second language with no page-specific code, just because it is in the catalog", async () => {
    mockApi();
    renderAt("/learn");

    expect(await screen.findByRole("link", { name: /Testlandic/ })).toHaveAttribute(
      "href",
      "/learn/xx",
    );
  });

  it("does not ask for levels or content until a language is chosen", async () => {
    const api = mockApi();
    renderAt("/learn");
    await screen.findByRole("link", { name: /Polish/ });

    expect(api.levels).not.toHaveBeenCalled();
    expect(api.content).not.toHaveBeenCalled();
  });

  it("announces loading while the catalog is fetched", async () => {
    const pending = deferred<LanguagesResponse>();
    vi.spyOn(catalogApi, "fetchLanguages").mockReturnValue(pending.promise);
    renderAt("/learn");

    expect(await screen.findByRole("status")).toHaveTextContent(/loading languages/i);

    pending.resolve(LANGUAGES);
    expect(await screen.findByRole("link", { name: /Polish/ })).toBeInTheDocument();
  });

  it("shows a safe error with a retry when the catalog cannot be loaded", async () => {
    const user = userEvent.setup();
    const languages = vi
      .spyOn(catalogApi, "fetchLanguages")
      .mockRejectedValueOnce(new ApiError("Something went wrong. Please try again.", 500))
      .mockResolvedValue(LANGUAGES);
    renderAt("/learn");

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t load the languages/i);
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("link", { name: /Polish/ })).toBeInTheDocument();
    expect(languages).toHaveBeenCalledTimes(2);
  });

  it("says so when no language is available yet", async () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue({ languages: [] });
    renderAt("/learn");

    expect(await screen.findByText(/no languages are available yet/i)).toBeInTheDocument();
  });
});

describe("LearnPage: level selection (/learn/:languageCode)", () => {
  it("shows the language's levels: the available one is selectable, the planned ones are not", async () => {
    mockApi();
    renderAt("/learn/pl");

    const nav = await screen.findByRole("navigation", { name: "Levels" });
    expect(within(nav).getByRole("link", { name: "A1" })).toHaveAttribute("href", "/learn/pl/a1");
    expect(within(nav).queryByRole("link", { name: /A2/ })).not.toBeInTheDocument();
    expect(within(nav).getAllByText("Coming soon")).toHaveLength(2);
  });

  it("marks the chosen language in the language list", async () => {
    mockApi();
    renderAt("/learn/pl");

    expect(await screen.findByRole("link", { name: /Polish/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("link", { name: /Testlandic/ })).not.toHaveAttribute("aria-current");
  });

  it("does not load content until an available level is chosen", async () => {
    const api = mockApi();
    renderAt("/learn/pl");
    await screen.findByRole("navigation", { name: "Levels" });

    expect(api.content).not.toHaveBeenCalled();
  });

  it("shows a safe not-found state for an unknown language, with a way back", async () => {
    const api = mockApi();
    renderAt("/learn/zz");

    expect(await screen.findByRole("heading", { name: /language not found/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /choose a language/i })).toHaveAttribute(
      "href",
      "/learn",
    );
    expect(api.content).not.toHaveBeenCalled();
  });

  it("treats a malformed language code the same way: not found, nothing echoed", async () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
    vi.spyOn(catalogApi, "fetchLanguageLevels").mockRejectedValue(
      new ApiError("Invalid request.", 400),
    );
    renderAt("/learn/%3Cscript%3E");

    expect(await screen.findByRole("heading", { name: /language not found/i })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("<script>");
  });

  it("shows a retryable error, not a not-found, when levels fail for another reason", async () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
    vi.spyOn(catalogApi, "fetchLanguageLevels").mockRejectedValue(new ApiError("boom", 500));
    renderAt("/learn/pl");

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t load the levels/i);
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

describe("LearnPage: content discovery (/learn/:languageCode/:levelId)", () => {
  it("lists the representative content for the chosen language and level, in order", async () => {
    const api = mockApi();
    renderAt("/learn/pl/a1");

    const list = await screen.findByRole("list", { name: "Content" });
    const items = within(list).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Greetings and goodbyes");
    expect(items[1]).toHaveTextContent("Polish has no articles");
    expect(api.content).toHaveBeenCalledWith("pl", "a1");
  });

  it("links each item to its own page under the language and level", async () => {
    mockApi();
    renderAt("/learn/pl/a1");

    expect(await screen.findByRole("link", { name: "Greetings and goodbyes" })).toHaveAttribute(
      "href",
      "/learn/pl/a1/pl-greetings",
    );
  });

  it("marks the chosen level as selected", async () => {
    mockApi();
    renderAt("/learn/pl/a1");

    const nav = await screen.findByRole("navigation", { name: "Levels" });
    expect(within(nav).getByRole("link", { name: "A1" })).toHaveAttribute("aria-current", "true");
  });

  it("does not request content for a planned level: it says the level is coming soon", async () => {
    const api = mockApi();
    renderAt("/learn/pl/a2");

    const notice = await screen.findByText(/A2 is coming soon for Polish/i);
    expect(notice).toHaveAttribute("role", "status");
    expect(api.content).not.toHaveBeenCalled();
    expect(screen.queryByRole("list", { name: "Content" })).not.toBeInTheDocument();
  });

  it("shows not-found for a level the language does not offer", async () => {
    const api = mockApi();
    renderAt("/learn/pl/z9");

    expect(await screen.findByRole("heading", { name: /level not found/i })).toBeInTheDocument();
    expect(api.content).not.toHaveBeenCalled();
  });

  it("shows a retryable error when the content cannot be loaded", async () => {
    const user = userEvent.setup();
    mockApi();
    const content = vi
      .spyOn(catalogApi, "fetchContentList")
      .mockRejectedValueOnce(new ApiError("boom", 500))
      .mockResolvedValue(POLISH_A1);
    renderAt("/learn/pl/a1");

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t load the content/i);
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("link", { name: "Greetings and goodbyes" })).toBeInTheDocument();
    expect(content).toHaveBeenCalledTimes(2);
  });

  it("says so when an available level has no content to show", async () => {
    mockApi();
    vi.spyOn(catalogApi, "fetchContentList").mockResolvedValue({ items: [] });
    renderAt("/learn/pl/a1");

    expect(
      await screen.findByText(/no content is available for this level yet/i),
    ).toBeInTheDocument();
  });

  it("serves a second, fictional language and level through exactly the same page", async () => {
    mockApi();
    renderAt("/learn/xx/a1");

    expect(await screen.findByRole("link", { name: "Only item" })).toHaveAttribute(
      "href",
      "/learn/xx/a1/xx-only",
    );
  });

  it("shows the level and content headings once, in a sensible outline", async () => {
    mockApi();
    renderAt("/learn/pl/a1");
    await screen.findByRole("list", { name: "Content" });

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Language",
      "Level for Polish",
      "Content",
    ]);
  });
});

describe("LearnPage: theme", () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: "light" });
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("stays fully usable in dark mode, and carries dark-mode styles on its controls", async () => {
    const user = userEvent.setup();
    mockApi();
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: RootLayout,
        children: [{ path: "learn/:languageCode?/:levelId?", Component: LearnPage }],
      },
    ]);
    renderWithProviders(<Stub initialEntries={["/learn/pl"]} />);
    await screen.findByRole("navigation", { name: "Levels" });

    await user.click(screen.getByRole("button", { name: "Toggle dark mode" }));

    expect(document.documentElement).toHaveClass("dark");
    const polish = screen.getByRole("link", { name: /Polish/ });
    expect(polish.className).toMatch(/dark:/);
    expect(screen.getByRole("link", { name: "A1" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Levels" }).innerHTML).toContain("dark:");
  });
});
