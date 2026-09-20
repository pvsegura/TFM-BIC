import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./api-error.js";
import { fetchCurrentProfile, updateProfile } from "./profile-api.js";

const PROFILE = {
  userId: "user-1",
  firstName: "Łukasz",
  lastName: "Kowalski",
  nickname: "lukas",
  avatarId: "avatar-02",
  email: "lukas@example.com",
  role: "STUDENT",
};

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch(200, PROFILE));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchCurrentProfile", () => {
  it("GETs /profile with credentials, asking for JSON, and returns the parsed profile", async () => {
    const result = await fetchCurrentProfile();

    expect(result).toEqual(PROFILE);
    expect(fetch).toHaveBeenCalledWith(
      "/profile",
      expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({ Accept: "application/json" }) as unknown,
      }),
    );
  });

  it("never sends a user id — identity comes from the session cookie", async () => {
    await fetchCurrentProfile();

    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(url).toBe("/profile");
    expect(init?.body).toBeUndefined();
  });

  it("strips fields the contract does not define", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { ...PROFILE, passwordHash: "argon2id$secret" }));

    const result = await fetchCurrentProfile();

    expect(result).not.toHaveProperty("passwordHash");
  });

  it("rejects a 200 response that does not match the contract", async () => {
    const { email: _email, ...withoutEmail } = PROFILE;
    vi.stubGlobal("fetch", mockFetch(200, withoutEmail));

    await expect(fetchCurrentProfile()).rejects.toThrow();
  });

  it("throws an ApiError carrying the status and the server's safe message", async () => {
    vi.stubGlobal("fetch", mockFetch(401, { error: "Unauthenticated" }));

    await expect(fetchCurrentProfile()).rejects.toMatchObject({
      name: "ApiError",
      message: "Unauthenticated",
      status: 401,
    });
  });

  it("throws a generic ApiError when the error body cannot be parsed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("boom")),
      }),
    );

    const error = await fetchCurrentProfile().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toMatch(/something went wrong/i);
  });

  it("lets a network failure propagate", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(fetchCurrentProfile()).rejects.toThrow(TypeError);
  });
});

describe("updateProfile", () => {
  it("PATCHes /profile with a JSON body and credentials, returning the saved profile", async () => {
    const result = await updateProfile({ firstName: "Łukasz", avatarId: "avatar-02" });

    expect(result).toEqual(PROFILE);
    expect(fetch).toHaveBeenCalledWith(
      "/profile",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Accept: "application/json",
        }) as unknown,
        body: JSON.stringify({ firstName: "Łukasz", avatarId: "avatar-02" }),
      }),
    );
  });

  it("sends an explicit null so a field can be cleared", async () => {
    await updateProfile({ nickname: null });

    const init = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(init?.body).toBe('{"nickname":null}');
  });

  it("throws an ApiError with per-field messages for a validation failure", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(400, {
        error: "Invalid request body.",
        fields: { nickname: "Enter 2–30 characters." },
      }),
    );

    const error = await updateProfile({ nickname: "x" }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      message: "Invalid request body.",
      fieldErrors: { nickname: "Enter 2–30 characters." },
    });
  });

  it("ignores field messages for keys that are not editable profile fields", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(400, {
        error: "Invalid request body.",
        fields: { nickname: "Enter 2–30 characters.", role: "leaked" },
      }),
    );

    const error = (await updateProfile({ nickname: "x" }).catch((e: unknown) => e)) as ApiError;

    expect(error.fieldErrors).toEqual({ nickname: "Enter 2–30 characters." });
  });

  it("has no field errors when the server gave none", async () => {
    vi.stubGlobal("fetch", mockFetch(403, { error: "Forbidden" }));

    const error = (await updateProfile({ firstName: "Ana" }).catch((e: unknown) => e)) as ApiError;

    expect(error.status).toBe(403);
    expect(error.message).toBe("Forbidden");
    expect(error.fieldErrors).toBeUndefined();
  });

  it("lets a network failure propagate so the caller can offer a retry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(updateProfile({ firstName: "Ana" })).rejects.toThrow(TypeError);
  });
});
