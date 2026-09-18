import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./api-error.js";
import { fetchCurrentUser, login, logout, register } from "./auth-api.js";

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch(200, {}));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("register", () => {
  it("posts to /auth/register with credentials included and returns the parsed message", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { message: "Check your email." }));

    const result = await register({ email: "user@example.com", password: "a-good-password" });

    expect(result).toEqual({ message: "Check your email." });
    expect(fetch).toHaveBeenCalledWith(
      "/auth/register",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("throws an ApiError with the server's safe message on failure", async () => {
    vi.stubGlobal("fetch", mockFetch(400, { error: "Not a valid email address." }));

    await expect(
      register({ email: "not-an-email", password: "a-good-password" }),
    ).rejects.toMatchObject({ message: "Not a valid email address.", status: 400 });
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

    await expect(
      register({ email: "user@example.com", password: "a-good-password" }),
    ).rejects.toThrow(ApiError);
  });
});

describe("login", () => {
  it("returns the safe user on success", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, {
        id: "1",
        email: "user@example.com",
        role: "STUDENT",
        emailVerified: true,
      }),
    );

    const user = await login({ email: "user@example.com", password: "correct-password" });

    expect(user.email).toBe("user@example.com");
  });

  it("throws ApiError(401) for invalid credentials", async () => {
    vi.stubGlobal("fetch", mockFetch(401, { error: "Invalid email or password." }));

    await expect(login({ email: "user@example.com", password: "wrong" })).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe("fetchCurrentUser", () => {
  it("returns null for an unauthenticated request (401)", async () => {
    vi.stubGlobal("fetch", mockFetch(401, { error: "Unauthenticated" }));

    expect(await fetchCurrentUser()).toBeNull();
  });

  it("returns the parsed user when authenticated", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, { id: "1", email: "user@example.com", role: "STUDENT", emailVerified: true }),
    );

    const user = await fetchCurrentUser();

    expect(user?.email).toBe("user@example.com");
  });
});

describe("logout", () => {
  it("resolves without throwing on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 204, json: () => Promise.resolve() }),
    );

    await expect(logout()).resolves.toBeUndefined();
  });

  it("does not throw for an already-anonymous session (401)", async () => {
    vi.stubGlobal("fetch", mockFetch(401, { error: "Unauthenticated" }));

    await expect(logout()).resolves.toBeUndefined();
  });
});
