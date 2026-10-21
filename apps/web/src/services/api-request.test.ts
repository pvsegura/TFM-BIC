import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, errorMessage, GENERIC_ERROR_MESSAGE } from "./api-error.js";
import { requestJson, requestPublicJson } from "./api-request.js";

function stub(status: number, body: () => Promise<unknown>) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue({ ok: status >= 200 && status < 300, status, json: body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestJson", () => {
  it("sends the session cookie and asks for JSON, and returns the parsed body", async () => {
    const fetchMock = stub(200, () => Promise.resolve({ ok: true }));

    const body = await requestJson("/somewhere");

    expect(body).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("/somewhere", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  });

  it("keeps the caller's method, body and extra headers, but never gives up the cookie", async () => {
    const fetchMock = stub(200, () => Promise.resolve({}));

    await requestJson("/somewhere", {
      method: "POST",
      body: "{}",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe("{}");
    expect(init.credentials).toBe("include");
    expect(init.headers).toEqual({
      Accept: "application/json",
      "Content-Type": "application/json",
    });
  });

  it("turns the API's fixed error message into an ApiError with the status", async () => {
    stub(404, () => Promise.resolve({ error: "Exercise not found." }));

    const error = await requestJson("/x").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "Exercise not found.", status: 404 });
  });

  it("uses a generic message when the error body is not the documented shape, or not JSON", async () => {
    stub(500, () => Promise.resolve({ message: "stack trace: secret" }));
    const shape = await requestJson("/x").catch((e: unknown) => e);
    stub(502, () => Promise.reject(new SyntaxError("not json")));
    const notJson = await requestJson("/x").catch((e: unknown) => e);

    expect(shape).toMatchObject({
      message: "Something went wrong. Please try again.",
      status: 500,
    });
    expect(notJson).toMatchObject({
      message: "Something went wrong. Please try again.",
      status: 502,
    });
  });
});

describe("requestPublicJson", () => {
  it("asks for JSON without asking for credentials — public, read-only data", async () => {
    const fetchMock = stub(200, () => Promise.resolve({ languages: [] }));

    const body = await requestPublicJson("/languages");

    expect(body).toEqual({ languages: [] });
    expect(fetchMock).toHaveBeenCalledWith("/languages", {
      headers: { Accept: "application/json" },
    });
  });

  it("turns a refusal into an ApiError like the authenticated requests", async () => {
    stub(404, () => Promise.resolve({ error: "Language not found." }));

    await expect(requestPublicJson("/languages/xx/levels")).rejects.toMatchObject({
      message: "Language not found.",
      status: 404,
    });
  });
});

describe("field errors", () => {
  it("keeps the per-field messages of a validation error, and only for known fields", async () => {
    stub(400, () =>
      Promise.resolve({
        error: "Some fields are invalid.",
        fields: { nickname: "Too long.", role: "Not editable." },
      }),
    );

    const error = await requestJson("/profile").catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 400, fieldErrors: { nickname: "Too long." } });
  });

  it("has no field errors when the API names none", async () => {
    stub(404, () => Promise.resolve({ error: "Not found." }));

    const error = (await requestJson("/x").catch((e: unknown) => e)) as ApiError;

    expect(error.fieldErrors).toBeUndefined();
  });
});

describe("errorMessage", () => {
  it("is the API's own message for an ApiError and the generic one for anything else", () => {
    expect(errorMessage(new ApiError("Invalid email or password.", 401))).toBe(
      "Invalid email or password.",
    );
    expect(errorMessage(new TypeError("Failed to fetch"))).toBe(GENERIC_ERROR_MESSAGE);
    expect(GENERIC_ERROR_MESSAGE).toBe("Something went wrong. Please try again.");
  });
});
