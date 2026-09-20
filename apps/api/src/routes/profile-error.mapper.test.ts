import {
  InvalidAvatarIdError,
  InvalidNicknameError,
  InvalidProfileNameError,
} from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import { mapProfileError } from "./profile-error.mapper.js";

describe("mapProfileError", () => {
  it.each([
    ["InvalidProfileNameError", new InvalidProfileNameError()],
    ["InvalidNicknameError", new InvalidNicknameError()],
    ["InvalidAvatarIdError", new InvalidAvatarIdError()],
  ])("maps %s to a generic 400", (_name, error) => {
    expect(mapProfileError(error)).toEqual({
      statusCode: 400,
      body: { error: "Invalid profile data." },
    });
  });

  it("rethrows an error it does not recognize instead of guessing", () => {
    const unknown = new Error("connection reset by peer");

    expect(() => mapProfileError(unknown)).toThrow(unknown);
  });

  it("rethrows a non-Error value", () => {
    expect(() => mapProfileError("boom")).toThrow();
  });
});
