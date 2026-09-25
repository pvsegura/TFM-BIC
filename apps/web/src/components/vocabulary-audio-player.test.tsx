import { renderWithProviders } from "@tfm-bic/testing";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as audioApi from "../services/audio-generations-api.js";
import * as authApi from "../services/auth-api.js";
import { VocabularyAudioPlayer } from "./vocabulary-audio-player.js";

const AUDIO = new Blob([new Uint8Array([1])], { type: "audio/wav" });

let createObjectURL: ReturnType<typeof vi.fn>;
let revokeObjectURL: ReturnType<typeof vi.fn>;
let play: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);
  let n = 0;
  createObjectURL = vi.fn(() => `blob:clip-${(n += 1)}`);
  revokeObjectURL = vi.fn();
  Object.assign(URL, { createObjectURL, revokeObjectURL });
  play = vi.fn(() => Promise.resolve());
  Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: play });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPlayer(hasExample = true) {
  return renderWithProviders(
    <VocabularyAudioPlayer vocabularyId="pl-dom" hasExample={hasExample} />,
  );
}

describe("VocabularyAudioPlayer", () => {
  it("starts with listen actions and a speed choice, and no player", () => {
    renderPlayer();

    expect(screen.getByRole("group", { name: "Listen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Listen to the word" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Listen to the example" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "Normal speed" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Slow" })).not.toBeChecked();
    expect(document.querySelector("audio")).toBeNull();
  });

  it("offers no example action for an entry without an example", () => {
    renderPlayer(false);

    expect(screen.queryByRole("button", { name: "Listen to the example" })).toBeNull();
  });

  it("shows a loading state, then a playable native audio player, and starts playing it", async () => {
    let resolve!: (blob: Blob) => void;
    const spy = vi
      .spyOn(audioApi, "requestVocabularyAudio")
      .mockReturnValue(new Promise((r) => (resolve = r)));
    renderPlayer();

    await userEvent.click(screen.getByRole("radio", { name: "Slow" }));
    await userEvent.click(screen.getByRole("button", { name: "Listen to the word" }));

    expect(screen.getByRole("status")).toHaveTextContent("Generating audio…");
    expect(screen.getByRole("button", { name: "Listen to the word" })).toBeDisabled();
    expect(spy).toHaveBeenCalledWith({ vocabularyItemId: "pl-dom", part: "lemma", voice: "slow" });

    resolve(AUDIO);
    const audio = await screen.findByLabelText("Audio: the word (slow)");
    expect(audio.tagName).toBe("AUDIO");
    expect(audio).toHaveAttribute("controls");
    expect(audio).toHaveAttribute("src", "blob:clip-1");
    expect(createObjectURL).toHaveBeenCalledWith(AUDIO);
    await waitFor(() => expect(play).toHaveBeenCalled());
  });

  it("releases the previous clip's object URL when a new one replaces it, and on unmount", async () => {
    vi.spyOn(audioApi, "requestVocabularyAudio").mockResolvedValue(AUDIO);
    const { unmount } = renderPlayer();

    await userEvent.click(screen.getByRole("button", { name: "Listen to the word" }));
    await screen.findByLabelText("Audio: the word (normal speed)");
    await userEvent.click(screen.getByRole("button", { name: "Listen to the example" }));
    await screen.findByLabelText("Audio: the example (normal speed)");

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:clip-1");
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:clip-2");
  });

  it("shows the server's fixed message on failure, and lets the student try again", async () => {
    const spy = vi
      .spyOn(audioApi, "requestVocabularyAudio")
      .mockRejectedValueOnce(new ApiError("Audio generation is temporarily unavailable.", 503))
      .mockResolvedValueOnce(AUDIO);
    renderPlayer();

    await userEvent.click(screen.getByRole("button", { name: "Listen to the word" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Audio generation is temporarily unavailable.",
    );
    expect(document.querySelector("audio")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Listen to the word" }));
    expect(await screen.findByLabelText("Audio: the word (normal speed)")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("shows a generic message for an unexpected failure", async () => {
    vi.spyOn(audioApi, "requestVocabularyAudio").mockRejectedValue(new TypeError("network"));
    renderPlayer();

    await userEvent.click(screen.getByRole("button", { name: "Listen to the word" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't generate audio. Please try again.",
    );
  });

  it("is operable by keyboard alone", async () => {
    vi.spyOn(audioApi, "requestVocabularyAudio").mockResolvedValue(AUDIO);
    renderPlayer();

    await userEvent.tab();
    expect(screen.getByRole("radio", { name: "Normal speed" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Slow" })).toBeChecked();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Listen to the word" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");

    expect(await screen.findByLabelText("Audio: the word (slow)")).toBeInTheDocument();
  });
});
