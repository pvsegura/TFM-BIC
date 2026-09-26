import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./api-error.js";
import { deleteAccount, fetchPersonalDataExport } from "./data-management-api.js";

const EXPORT = {
  exportVersion: "1",
  generatedAt: "2026-09-26T10:00:00.000Z",
  account: {
    userId: "user-1",
    email: "ada@example.com",
    role: "STUDENT",
    emailVerified: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  profile: null,
  learning: { lessons: [], exerciseAttempts: [] },
  vocabulary: { items: [] },
  phonetics: { items: [] },
  gamification: { totalPoints: 0, pointTransactions: [], achievements: [] },
  media: { videoGenerationJobs: [] },
  communication: { essentialEmails: "always-on", newsletter: null },
  teaching: { linkedTeachers: [], linkedStudentCount: 0 },
  notIncluded: [],
};

function mockFetch(
  status: number,
  body: unknown,
  headers: Record<string, string> = {
    "content-disposition": 'attachment; filename="tfm-bic-personal-data-2026-09-26.json"',
  },
) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(JSON.parse(text) as unknown),
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

function lastCall(fn: ReturnType<typeof mockFetch>): [string, RequestInit] {
  return fn.mock.calls.at(-1) as [string, RequestInit];
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPersonalDataExport", () => {
  it("GETs the export with the session cookie and nothing identifying in the URL", async () => {
    const fn = mockFetch(200, EXPORT);

    await fetchPersonalDataExport();

    const [url, init] = lastCall(fn);
    expect(url).toBe("/data-management/export");
    expect(init.credentials).toBe("include");
    expect(init.method ?? "GET").toBe("GET");
  });

  it("returns the server's file name and the validated document as pretty JSON", async () => {
    mockFetch(200, EXPORT);

    const result = await fetchPersonalDataExport();

    expect(result.fileName).toBe("tfm-bic-personal-data-2026-09-26.json");
    expect(JSON.parse(result.content)).toEqual(EXPORT);
    expect(result.content).toContain("\n  ");
  });

  it("falls back to a generic file name when the header is missing or unsafe", async () => {
    mockFetch(200, EXPORT, {});
    expect((await fetchPersonalDataExport()).fileName).toBe("tfm-bic-personal-data.json");

    mockFetch(200, EXPORT, { "content-disposition": 'attachment; filename="../../evil.sh"' });
    expect((await fetchPersonalDataExport()).fileName).toBe("tfm-bic-personal-data.json");
  });

  it("refuses a body that is not a version-1 export", async () => {
    mockFetch(200, { ...EXPORT, exportVersion: "2" });

    await expect(fetchPersonalDataExport()).rejects.toThrow();
  });

  it("turns an error response into an ApiError", async () => {
    mockFetch(429, { error: "Rate limit exceeded, retry in 1 hour" });

    await expect(fetchPersonalDataExport()).rejects.toBeInstanceOf(ApiError);
  });
});

describe("deleteAccount", () => {
  it("POSTs the password with an explicit confirmation and no identifier", async () => {
    const fn = mockFetch(204, "");

    await deleteAccount("my-password");

    const [url, init] = lastCall(fn);
    expect(url).toBe("/data-management/account-deletion");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body as string)).toEqual({ password: "my-password", confirm: true });
  });

  it("surfaces the API's message for a wrong password", async () => {
    mockFetch(403, { error: "The password is incorrect." });

    await expect(deleteAccount("wrong")).rejects.toMatchObject({
      message: "The password is incorrect.",
      status: 403,
    });
  });
});
