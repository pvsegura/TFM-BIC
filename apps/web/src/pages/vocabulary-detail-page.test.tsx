import type { VocabularyItemResponse, VocabularyUserStateResponse } from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as authApi from "../services/auth-api.js";
import * as vocabularyApi from "../services/vocabulary-api.js";
import { VocabularyDetailPage } from "./vocabulary-detail-page.js";

const NEW_STATE: VocabularyUserStateResponse = {
  status: "new",
  createdAt: null,
  updatedAt: null,
  learnedAt: null,
};
const SAVED_STATE: VocabularyUserStateResponse = {
  status: "saved",
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  learnedAt: null,
};
const LEARNED_STATE: VocabularyUserStateResponse = {
  status: "learned",
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:05:00.000Z",
  learnedAt: "2026-01-01T10:05:00.000Z",
};

function item(userState: VocabularyUserStateResponse = NEW_STATE): VocabularyItemResponse {
  return {
    id: "pl-dom",
    languageId: "pl",
    category: { id: "everyday", title: "Everyday life" },
    lemma: "dom",
    translation: "house; home",
    instructionLanguage: "en",
    levelId: "a1",
    partOfSpeech: "noun",
    gender: "masculine",
    plural: "domy",
    note: "Also a building where people live.",
    example: { text: "Mój dom jest mały.", translation: "My house is small." },
    userState,
  } as unknown as VocabularyItemResponse;
}

function renderAt(path: string) {
  const Stub = createRoutesStub([
    { path: "/learn/vocabulary/:vocabularyId", Component: VocabularyDetailPage },
  ]);
  return renderWithProviders(<Stub initialEntries={[path]} />);
}

beforeEach(() => {
  vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("VocabularyDetailPage", () => {
  it("shows a loading state, then the word, its meaning and its grammar facts", async () => {
    vi.spyOn(vocabularyApi, "fetchVocabularyItem").mockResolvedValue(item());
    renderAt("/learn/vocabulary/pl-dom");

    expect(screen.getByRole("status")).toHaveTextContent("Loading word…");
    expect(await screen.findByRole("heading", { level: 1, name: "dom" })).toBeInTheDocument();
    expect(screen.getByText("house; home")).toBeInTheDocument();
    expect(screen.getByText("Everyday life")).toBeInTheDocument();
    expect(screen.getByText("A1")).toBeInTheDocument();
    expect(screen.getByText("noun")).toBeInTheDocument();
    expect(screen.getByText("masculine")).toBeInTheDocument();
    expect(screen.getByText("domy")).toBeInTheDocument();
    expect(screen.getByText("Also a building where people live.")).toBeInTheDocument();
    expect(screen.getByText("Mój dom jest mały.")).toBeInTheDocument();
    expect(screen.getByText("My house is small.")).toBeInTheDocument();
  });

  it("does not show a fact the entry does not have", async () => {
    vi.spyOn(vocabularyApi, "fetchVocabularyItem").mockResolvedValue({
      id: "pl-x",
      languageId: "pl",
      category: { id: "everyday", title: "Everyday life" },
      lemma: "x",
      translation: "x",
      instructionLanguage: "en",
      userState: NEW_STATE,
    } as unknown as VocabularyItemResponse);
    renderAt("/learn/vocabulary/pl-x");

    await screen.findByRole("heading", { level: 1, name: "x" });

    expect(screen.queryByText(/Level/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Gender/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Plural/)).not.toBeInTheDocument();
  });

  it("shows a not-found notice for a missing or hidden entry, never the requested id", async () => {
    vi.spyOn(vocabularyApi, "fetchVocabularyItem").mockRejectedValue(
      new ApiError("Vocabulary item not found.", 404),
    );
    renderAt("/learn/vocabulary/pl-nope");

    expect(await screen.findByText("Vocabulary item not found")).toBeInTheDocument();
    expect(screen.getByText("That word is not available.")).toBeInTheDocument();
    expect(screen.queryByText("pl-nope")).not.toBeInTheDocument();
  });

  it("shows a retryable error for a server failure", async () => {
    const fetchItem = vi
      .spyOn(vocabularyApi, "fetchVocabularyItem")
      .mockRejectedValueOnce(new ApiError("boom", 500))
      .mockResolvedValueOnce(item());
    renderAt("/learn/vocabulary/pl-dom");

    await screen.findByRole("alert");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("heading", { level: 1, name: "dom" })).toBeInTheDocument();
    expect(fetchItem).toHaveBeenCalledTimes(2);
  });

  it("saves an untouched word and shows the new status without a page reload", async () => {
    vi.spyOn(vocabularyApi, "fetchVocabularyItem").mockResolvedValue(item(NEW_STATE));
    const save = vi.spyOn(vocabularyApi, "saveVocabularyItem").mockResolvedValue(SAVED_STATE);
    renderAt("/learn/vocabulary/pl-dom");
    await screen.findByRole("heading", { level: 1, name: "dom" });

    await userEvent.click(screen.getByRole("button", { name: "Save word" }));

    expect(save).toHaveBeenCalledWith("pl-dom");
    await waitFor(() => {
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Remove from list" })).toBeInTheDocument();
  });

  it("marks a saved word as learned", async () => {
    vi.spyOn(vocabularyApi, "fetchVocabularyItem").mockResolvedValue(item(SAVED_STATE));
    const markLearned = vi
      .spyOn(vocabularyApi, "markVocabularyItemLearned")
      .mockResolvedValue(LEARNED_STATE);
    renderAt("/learn/vocabulary/pl-dom");
    await screen.findByRole("heading", { level: 1, name: "dom" });

    await userEvent.click(screen.getByRole("button", { name: "Mark as learned" }));

    expect(markLearned).toHaveBeenCalledWith("pl-dom");
    await waitFor(() => {
      expect(screen.getByText("Learned")).toBeInTheDocument();
    });
  });

  it("offers no 'mark as learned' button once a word is already learned", async () => {
    vi.spyOn(vocabularyApi, "fetchVocabularyItem").mockResolvedValue(item(LEARNED_STATE));
    renderAt("/learn/vocabulary/pl-dom");
    await screen.findByRole("heading", { level: 1, name: "dom" });

    expect(screen.queryByRole("button", { name: "Mark as learned" })).not.toBeInTheDocument();
  });

  it("removes a saved word from the list", async () => {
    vi.spyOn(vocabularyApi, "fetchVocabularyItem").mockResolvedValue(item(SAVED_STATE));
    const unsave = vi.spyOn(vocabularyApi, "unsaveVocabularyItem").mockResolvedValue(NEW_STATE);
    renderAt("/learn/vocabulary/pl-dom");
    await screen.findByRole("heading", { level: 1, name: "dom" });

    await userEvent.click(screen.getByRole("button", { name: "Remove from list" }));

    expect(unsave).toHaveBeenCalledWith("pl-dom");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save word" })).toBeInTheDocument();
    });
  });

  it("shows an alert, not a silent failure, when saving fails", async () => {
    vi.spyOn(vocabularyApi, "fetchVocabularyItem").mockResolvedValue(item(NEW_STATE));
    vi.spyOn(vocabularyApi, "saveVocabularyItem").mockRejectedValue(new ApiError("boom", 500));
    renderAt("/learn/vocabulary/pl-dom");
    await screen.findByRole("heading", { level: 1, name: "dom" });

    await userEvent.click(screen.getByRole("button", { name: "Save word" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
  });
});
