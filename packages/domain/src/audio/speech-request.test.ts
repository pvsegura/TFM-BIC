import { describe, expect, it } from "vitest";

import { createLanguageId } from "../language/language-id.js";
import { InvalidSpeechTextError } from "./errors/invalid-speech-text.error.js";
import {
  createSpeechRequest,
  createSpeechText,
  SPEECH_TEXT_MAX_LENGTH,
  speechRequestKey,
} from "./speech-request.js";
import { isVoiceProfile, VOICE_PROFILES } from "./voice-profile.js";

const pl = createLanguageId("pl");

describe("createSpeechText", () => {
  it("trims and collapses whitespace but keeps the text otherwise untouched (diacritics included)", () => {
    expect(createSpeechText("  Mój   dom\n jest  mały.  ")).toBe("Mój dom jest mały.");
  });

  it("rejects empty and whitespace-only text", () => {
    expect(() => createSpeechText("")).toThrow(InvalidSpeechTextError);
    expect(() => createSpeechText("   \n\t ")).toThrow(InvalidSpeechTextError);
  });

  it("reports why the text is invalid, as a fixed reason code", () => {
    try {
      createSpeechText("");
      expect.unreachable();
    } catch (error) {
      expect((error as InvalidSpeechTextError).reason).toBe("empty");
    }
  });

  it("rejects text longer than the given limit, measured after normalisation", () => {
    expect(createSpeechText("abcde", 5)).toBe("abcde");
    expect(createSpeechText("  abcde  ", 5)).toBe("abcde");
    try {
      createSpeechText("abcdef", 5);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidSpeechTextError);
      expect((error as InvalidSpeechTextError).reason).toBe("too_long");
    }
  });

  it("never allows a limit above the domain's own hard ceiling", () => {
    const tooLong = "a".repeat(SPEECH_TEXT_MAX_LENGTH + 1);
    expect(() => createSpeechText(tooLong, SPEECH_TEXT_MAX_LENGTH * 10)).toThrow(
      InvalidSpeechTextError,
    );
    expect(createSpeechText("a".repeat(SPEECH_TEXT_MAX_LENGTH))).toHaveLength(
      SPEECH_TEXT_MAX_LENGTH,
    );
  });

  it("counts characters, not UTF-16 code units, so non-Latin text is not penalised", () => {
    expect(createSpeechText("ąęćźż", 5)).toBe("ąęćźż");
    expect(createSpeechText("😀😀", 2)).toBe("😀😀");
  });

  it("rejects control characters (other than the whitespace it normalises)", () => {
    try {
      createSpeechText("dom\u0000");
      expect.unreachable();
    } catch (error) {
      expect((error as InvalidSpeechTextError).reason).toBe("control_characters");
    }
    expect(() => createSpeechText("dom\u001b[31m")).toThrow(InvalidSpeechTextError);
    expect(() => createSpeechText("dom\u007f")).toThrow(InvalidSpeechTextError);
  });

  it("does not put the rejected text in the error message", () => {
    const error = new InvalidSpeechTextError("too_long");
    expect(error.name).toBe("InvalidSpeechTextError");
    expect(error.message).not.toContain("secret");
  });
});

describe("voice profiles", () => {
  it("are provider-independent names, never a provider's voice id", () => {
    expect(VOICE_PROFILES).toEqual(["standard", "slow"]);
    expect(isVoiceProfile("slow")).toBe(true);
    expect(isVoiceProfile("Kore")).toBe(false);
  });
});

describe("createSpeechRequest", () => {
  it("builds a request from validated parts", () => {
    const request = createSpeechRequest({ text: " dom ", languageId: pl, voice: "standard" });
    expect(request).toEqual({ text: "dom", languageId: "pl", voice: "standard" });
  });

  it("applies the configured length limit", () => {
    expect(() =>
      createSpeechRequest({ text: "abcdef", languageId: pl, voice: "standard" }, 5),
    ).toThrow(InvalidSpeechTextError);
  });
});

describe("speechRequestKey", () => {
  it("is the same for two requests that would produce the same audio", () => {
    const a = createSpeechRequest({ text: "Mój  dom", languageId: pl, voice: "slow" });
    const b = createSpeechRequest({ text: " Mój dom ", languageId: pl, voice: "slow" });
    expect(speechRequestKey(a)).toBe(speechRequestKey(b));
  });

  it("differs when the language, the voice or the text differs", () => {
    const base = createSpeechRequest({ text: "dom", languageId: pl, voice: "standard" });
    const keys = new Set([
      speechRequestKey(base),
      speechRequestKey({ ...base, voice: "slow" }),
      speechRequestKey({ ...base, languageId: createLanguageId("cs") }),
      speechRequestKey({ ...base, text: createSpeechText("dom.") }),
    ]);
    expect(keys.size).toBe(4);
  });

  it("cannot be confused by a separator inside the text", () => {
    const a = speechRequestKey({
      text: createSpeechText("a|slow"),
      languageId: pl,
      voice: "standard",
    });
    const b = speechRequestKey({ text: createSpeechText("a"), languageId: pl, voice: "slow" });
    expect(a).not.toBe(b);
  });
});
