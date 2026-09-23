import type {
  PhoneticRepresentationResponse,
  PhoneticUserProgressResponse,
} from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as authApi from "../services/auth-api.js";
import * as phoneticsApi from "../services/phonetics-api.js";
import { PhoneticDetailPage } from "./phonetic-detail-page.js";

const NOT_STARTED: PhoneticUserProgressResponse = {
  status: "not_started",
  firstViewedAt: null,
  lastViewedAt: null,
  practicedAt: null,
  completedAt: null,
};
const VIEWED: PhoneticUserProgressResponse = {
  status: "viewed",
  firstViewedAt: "2026-01-01T10:00:00.000Z",
  lastViewedAt: "2026-01-01T10:00:00.000Z",
  practicedAt: null,
  completedAt: null,
};
const PRACTICED: PhoneticUserProgressResponse = {
  status: "practiced",
  firstViewedAt: "2026-01-01T10:00:00.000Z",
  lastViewedAt: "2026-01-01T10:05:00.000Z",
  practicedAt: "2026-01-01T10:05:00.000Z",
  completedAt: null,
};
const COMPLETED: PhoneticUserProgressResponse = {
  status: "completed",
  firstViewedAt: "2026-01-01T10:00:00.000Z",
  lastViewedAt: "2026-01-01T10:10:00.000Z",
  practicedAt: "2026-01-01T10:05:00.000Z",
  completedAt: "2026-01-01T10:10:00.000Z",
};

function representation(
  userProgress: PhoneticUserProgressResponse = NOT_STARTED,
): PhoneticRepresentationResponse {
  return {
    id: "pl-ipa-ts",
    languageId: "pl",
    topic: { id: "consonants", title: "Consonants" },
    ipa: "t͡ʂ",
    description: "Voiceless retroflex affricate, spelled cz.",
    instructionLanguage: "en",
    levelId: "a1",
    note: "Contrasts with ć.",
    exampleWords: [{ word: "czas", translation: "time" }],
    userProgress,
  } as unknown as PhoneticRepresentationResponse;
}

function renderAt(path: string) {
  const Stub = createRoutesStub([
    { path: "/learn/phonetics/:phoneticId", Component: PhoneticDetailPage },
  ]);
  return renderWithProviders(<Stub initialEntries={[path]} />);
}

beforeEach(() => {
  vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PhoneticDetailPage", () => {
  it("shows a loading state, then the sound, its IPA, topic, level, note and example words", async () => {
    vi.spyOn(phoneticsApi, "fetchPhonetic").mockResolvedValue(representation());
    vi.spyOn(phoneticsApi, "recordPhoneticView").mockResolvedValue(VIEWED);
    renderAt("/learn/phonetics/pl-ipa-ts");

    expect(screen.getByRole("status")).toHaveTextContent("Loading sound…");
    expect(await screen.findByText("t͡ʂ")).toBeInTheDocument();
    expect(screen.getByText("Voiceless retroflex affricate, spelled cz.")).toBeInTheDocument();
    expect(screen.getByText("Consonants")).toBeInTheDocument();
    expect(screen.getByText("A1")).toBeInTheDocument();
    expect(screen.getByText("Contrasts with ć.")).toBeInTheDocument();
    expect(screen.getByText("czas")).toBeInTheDocument();
    expect(screen.getByText("time")).toBeInTheDocument();
  });

  it("does not show a fact the representation does not have", async () => {
    vi.spyOn(phoneticsApi, "fetchPhonetic").mockResolvedValue({
      id: "pl-ipa-a",
      languageId: "pl",
      ipa: "a",
      description: "Open front unrounded vowel.",
      instructionLanguage: "en",
      userProgress: NOT_STARTED,
    } as unknown as PhoneticRepresentationResponse);
    vi.spyOn(phoneticsApi, "recordPhoneticView").mockResolvedValue(VIEWED);
    renderAt("/learn/phonetics/pl-ipa-a");

    await screen.findByText("a");

    expect(screen.queryByText(/Level/)).not.toBeInTheDocument();
    expect(screen.queryByText("Consonants")).not.toBeInTheDocument();
  });

  it("shows a not-found notice for a missing or hidden representation, never the requested id", async () => {
    vi.spyOn(phoneticsApi, "fetchPhonetic").mockRejectedValue(
      new ApiError("Phonetic representation not found.", 404),
    );
    renderAt("/learn/phonetics/pl-ipa-nope");

    expect(await screen.findByText("Phonetic representation not found")).toBeInTheDocument();
    expect(screen.getByText("That sound is not available.")).toBeInTheDocument();
    expect(screen.queryByText("pl-ipa-nope")).not.toBeInTheDocument();
  });

  it("shows a retryable error for a server failure", async () => {
    const fetchOne = vi
      .spyOn(phoneticsApi, "fetchPhonetic")
      .mockRejectedValueOnce(new ApiError("boom", 500))
      .mockResolvedValueOnce(representation());
    vi.spyOn(phoneticsApi, "recordPhoneticView").mockResolvedValue(VIEWED);
    renderAt("/learn/phonetics/pl-ipa-ts");

    await screen.findByRole("alert");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("t͡ʂ")).toBeInTheDocument();
    expect(fetchOne).toHaveBeenCalledTimes(2);
  });

  it("records a view automatically once the representation loads", async () => {
    vi.spyOn(phoneticsApi, "fetchPhonetic").mockResolvedValue(representation(NOT_STARTED));
    const recordView = vi.spyOn(phoneticsApi, "recordPhoneticView").mockResolvedValue(VIEWED);
    renderAt("/learn/phonetics/pl-ipa-ts");

    await screen.findByText("t͡ʂ");

    await waitFor(() => {
      expect(recordView).toHaveBeenCalledWith("pl-ipa-ts");
    });
  });

  it("practices a viewed sound and shows the new status without a page reload", async () => {
    vi.spyOn(phoneticsApi, "fetchPhonetic").mockResolvedValue(representation(VIEWED));
    vi.spyOn(phoneticsApi, "recordPhoneticView").mockResolvedValue(VIEWED);
    const practice = vi.spyOn(phoneticsApi, "recordPhoneticPractice").mockResolvedValue(PRACTICED);
    renderAt("/learn/phonetics/pl-ipa-ts");
    await screen.findByText("t͡ʂ");

    await userEvent.click(screen.getByRole("button", { name: "Practice" }));

    expect(practice).toHaveBeenCalledWith("pl-ipa-ts");
    await waitFor(() => {
      expect(screen.getByText("Practiced")).toBeInTheDocument();
    });
  });

  it("completes a practiced sound", async () => {
    vi.spyOn(phoneticsApi, "fetchPhonetic").mockResolvedValue(representation(PRACTICED));
    vi.spyOn(phoneticsApi, "recordPhoneticView").mockResolvedValue(VIEWED);
    const complete = vi.spyOn(phoneticsApi, "completePhonetic").mockResolvedValue(COMPLETED);
    renderAt("/learn/phonetics/pl-ipa-ts");
    await screen.findByText("t͡ʂ");

    await userEvent.click(screen.getByRole("button", { name: "Mark as completed" }));

    expect(complete).toHaveBeenCalledWith("pl-ipa-ts");
    await waitFor(() => {
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });
  });

  it("offers no practice or complete button once a sound is already completed", async () => {
    vi.spyOn(phoneticsApi, "fetchPhonetic").mockResolvedValue(representation(COMPLETED));
    vi.spyOn(phoneticsApi, "recordPhoneticView").mockResolvedValue(COMPLETED);
    renderAt("/learn/phonetics/pl-ipa-ts");
    await screen.findByText("t͡ʂ");

    expect(screen.queryByRole("button", { name: "Practice" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as completed" })).not.toBeInTheDocument();
  });

  it("shows an alert, not a silent failure, when practicing fails", async () => {
    vi.spyOn(phoneticsApi, "fetchPhonetic").mockResolvedValue(representation(VIEWED));
    vi.spyOn(phoneticsApi, "recordPhoneticView").mockResolvedValue(VIEWED);
    vi.spyOn(phoneticsApi, "recordPhoneticPractice").mockRejectedValue(new ApiError("boom", 500));
    renderAt("/learn/phonetics/pl-ipa-ts");
    await screen.findByText("t͡ʂ");

    await userEvent.click(screen.getByRole("button", { name: "Practice" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
  });
});
