import type { ContentResponse, LanguagesResponse } from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as catalogApi from "../services/catalog-api.js";
import { ContentPage } from "./content-page.js";

const ITEM = {
  id: "pl-greetings",
  languageId: "pl",
  levelId: "a1",
  type: "lesson",
  title: "Greetings and goodbyes",
  description: "Say hello.",
  order: 10,
  instructionLanguage: "en",
  blocks: [
    { type: "explanation", text: "Polish has formal and informal greetings." },
    { type: "example", text: "Cześć!", translation: "Hi!", note: "Informal." },
    {
      type: "dialogue",
      lines: [{ speaker: "Anna", text: "Cześć!", translation: "Hi!" }],
    },
  ],
} as unknown as ContentResponse;

const LANGUAGES = {
  languages: [
    { code: "pl", name: "Polish", nativeName: "polski", locale: "pl-PL", direction: "ltr" },
  ],
} as unknown as LanguagesResponse;

function renderAt(path: string) {
  const Stub = createRoutesStub([
    { path: "/learn/:languageCode/:levelId/:contentId", Component: ContentPage },
    { path: "/learn/:languageCode?/:levelId?", Component: () => <p>Learn page</p> },
  ]);
  return renderWithProviders(<Stub initialEntries={[path]} />);
}

function mockApi(item: ContentResponse = ITEM) {
  vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
  return vi.spyOn(catalogApi, "fetchContent").mockResolvedValue(item);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ContentPage (/learn/:languageCode/:levelId/:contentId)", () => {
  it("renders the item's title, description and every block through the safe block components", async () => {
    mockApi();
    renderAt("/learn/pl/a1/pl-greetings");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Greetings and goodbyes" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Say hello.")).toBeInTheDocument();
    expect(screen.getByText("Polish has formal and informal greetings.")).toBeInTheDocument();
    expect(screen.getAllByText("Cześć!").length).toBeGreaterThan(0);
    expect(screen.getByText("Informal.")).toBeInTheDocument();
    expect(screen.getByText("Anna")).toBeInTheDocument();
  });

  it("tags the Polish text with the language taken from the catalog metadata", async () => {
    mockApi();
    renderAt("/learn/pl/a1/pl-greetings");
    await screen.findByRole("heading", { level: 1 });

    const [first] = screen.getAllByText("Cześć!");
    expect(first).toHaveAttribute("lang", "pl-PL");
    expect(first).toHaveAttribute("dir", "ltr");
  });

  it("marks that this is a preview: the lesson experience itself is not part of this page", async () => {
    mockApi();
    renderAt("/learn/pl/a1/pl-greetings");

    expect(await screen.findByText(/reading view/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /complete|start|submit|check/i })).toBeNull();
  });

  it("links back to the level's content list", async () => {
    mockApi();
    renderAt("/learn/pl/a1/pl-greetings");

    expect(await screen.findByRole("link", { name: /back to the content list/i })).toHaveAttribute(
      "href",
      "/learn/pl/a1",
    );
  });

  it("announces loading", async () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
    vi.spyOn(catalogApi, "fetchContent").mockReturnValue(new Promise(() => undefined));
    renderAt("/learn/pl/a1/pl-greetings");

    expect(await screen.findByRole("status")).toHaveTextContent(/loading/i);
  });

  it.each([404, 400])("shows a safe not-found state when the API says %i", async (status) => {
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
    vi.spyOn(catalogApi, "fetchContent").mockRejectedValue(new ApiError("nope", status));
    renderAt("/learn/pl/a1/pl-draft");

    expect(await screen.findByRole("heading", { name: /content not found/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /choose a language/i })).toHaveAttribute(
      "href",
      "/learn",
    );
  });

  it("does not trust the URL: an item filed under a different language or level is not found", async () => {
    mockApi();
    renderAt("/learn/pl/b2/pl-greetings");

    expect(await screen.findByRole("heading", { name: /content not found/i })).toBeInTheDocument();
    expect(screen.queryByText("Say hello.")).not.toBeInTheDocument();
  });

  it("shows a retryable error for any other failure", async () => {
    const user = userEvent.setup();
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
    const fetchContent = vi
      .spyOn(catalogApi, "fetchContent")
      .mockRejectedValueOnce(new ApiError("boom", 500))
      .mockResolvedValue(ITEM);
    renderAt("/learn/pl/a1/pl-greetings");

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t load this content/i);
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(fetchContent).toHaveBeenCalledTimes(2);
  });

  it("still renders when the language catalog is unavailable, leaving direction to the browser", async () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockRejectedValue(new ApiError("boom", 500));
    vi.spyOn(catalogApi, "fetchContent").mockResolvedValue(ITEM);
    renderAt("/learn/pl/a1/pl-greetings");

    await screen.findByRole("heading", { level: 1 });
    const [first] = screen.getAllByText("Cześć!");
    expect(first).toHaveAttribute("dir", "auto");
  });
});
