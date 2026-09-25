import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./api-error.js";
import { requestVocabularyAudio } from "./audio-generations-api.js";

const AUDIO = new Blob([new Uint8Array([82, 73, 70, 70])], { type: "audio/wav" });

function stub(response: Partial<Response>) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

function audioResponse(contentType = "audio/wav"): Partial<Response> {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "Content-Type": contentType }),
    blob: () => Promise.resolve(AUDIO),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestVocabularyAudio", () => {
  it("posts only the entry, the part and the voice profile, with the session cookie", async () => {
    stub(audioResponse());

    await requestVocabularyAudio({ vocabularyItemId: "pl-dom", part: "example", voice: "slow" });

    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe("/audio-generations");
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("include");
    expect(JSON.parse(init?.body as string)).toEqual({
      source: { type: "vocabulary-item", vocabularyItemId: "pl-dom", part: "example" },
      voice: "slow",
    });
    expect(new Headers(init?.headers).get("accept")).toBe("audio/wav");
  });

  it("returns the audio as a Blob", async () => {
    stub(audioResponse());

    const blob = await requestVocabularyAudio({
      vocabularyItemId: "pl-dom",
      part: "lemma",
      voice: "standard",
    });

    expect(blob).toBe(AUDIO);
  });

  it("refuses a success response that is not one of the documented audio types", async () => {
    stub(audioResponse("text/html"));

    await expect(
      requestVocabularyAudio({ vocabularyItemId: "pl-dom", part: "lemma", voice: "standard" }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("throws an ApiError carrying the server's fixed message and status on failure", async () => {
    stub({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ error: "Audio generation is temporarily unavailable." }),
    });

    const error = await requestVocabularyAudio({
      vocabularyItemId: "pl-dom",
      part: "lemma",
      voice: "standard",
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(503);
    expect((error as ApiError).message).toBe("Audio generation is temporarily unavailable.");
  });
});
