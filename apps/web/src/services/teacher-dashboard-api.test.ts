import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./api-error.js";
import {
  fetchTeacherOverview,
  fetchTeacherStudent,
  fetchTeacherStudents,
  studentListSearch,
} from "./teacher-dashboard-api.js";

const OVERVIEW = {
  totalStudents: 1,
  activeStudents: 1,
  inactiveStudents: 0,
  activeWindowDays: 7,
  lessonsCompleted: 2,
  exerciseAttempts: 4,
  accuracyPercent: 75,
  points: 40,
};
const STUDENTS = {
  students: [],
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  sort: { field: "name", direction: "asc" },
};

function mockFetch(body: unknown, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("teacher dashboard API client", () => {
  it("reads the overview with the session cookie and validates it", async () => {
    const fetchMock = mockFetch(OVERVIEW);

    await expect(fetchTeacherOverview()).resolves.toEqual(OVERVIEW);
    expect(fetchMock).toHaveBeenCalledWith(
      "/teacher-dashboard/overview",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("sends only the documented list parameters, never an identity", async () => {
    const fetchMock = mockFetch(STUDENTS);

    await fetchTeacherStudents({
      q: "ana",
      activity: "active",
      sort: "points",
      direction: "desc",
      page: 2,
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/teacher-dashboard/students?q=ana&activity=active&sort=points&direction=desc&page=2",
    );
  });

  it("encodes the student id and the search term", async () => {
    const fetchMock = mockFetch(STUDENTS);
    await fetchTeacherStudents({ q: "a&b=c" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/teacher-dashboard/students?q=a%26b%3Dc");

    fetchMock.mockClear();
    await expect(fetchTeacherStudent("../x")).rejects.toThrow();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/teacher-dashboard/students/..%2Fx");
  });

  it("turns an error response into an ApiError with the API's safe message", async () => {
    mockFetch({ error: "Student not found." }, 404);
    const error: unknown = await fetchTeacherStudent("7d9f1c1e-2f0a-4c55-9d0e-3d9b8f6a1b2c").catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, message: "Student not found." });
  });
});

describe("studentListSearch — URL search params → validated list parameters", () => {
  it("keeps valid values and drops anything else", () => {
    expect(
      studentListSearch(
        new URLSearchParams("q=%20ana%20&activity=active&sort=points&direction=asc&page=3&x=1"),
      ),
    ).toEqual({ q: "ana", activity: "active", sort: "points", direction: "asc", page: 3 });
    expect(
      studentListSearch(
        new URLSearchParams("q=&activity=all&sort=password_hash&direction=up&page=-2"),
      ),
    ).toEqual({});
  });
});
