import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as api from "../services/teacher-dashboard-api.js";
import { clearUserScopedCache } from "./session-cache.js";
import { CURRENT_USER_QUERY_KEY } from "./use-current-user.js";
import {
  TEACHER_QUERY_KEY_ROOT,
  useTeacherOverview,
  useTeacherStudent,
  useTeacherStudents,
} from "./use-teacher-dashboard.js";

function setup() {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

const OVERVIEW = {
  totalStudents: 0,
  activeStudents: 0,
  inactiveStudents: 0,
  activeWindowDays: 7,
  lessonsCompleted: 0,
  exerciseAttempts: 0,
  accuracyPercent: null,
  points: 0,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("teacher dashboard hooks", () => {
  it("caches the teacher's data under a user-scoped root that logout clears", async () => {
    vi.spyOn(api, "fetchTeacherOverview").mockResolvedValue(OVERVIEW);
    const { client, wrapper } = setup();

    const { result } = renderHook(() => useTeacherOverview(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData([TEACHER_QUERY_KEY_ROOT, "overview"])).toEqual(OVERVIEW);

    clearUserScopedCache(client);
    expect(client.getQueryData([TEACHER_QUERY_KEY_ROOT, "overview"])).toBeUndefined();
  });

  it("keys each roster page by its parameters", async () => {
    const fetchStudents = vi.spyOn(api, "fetchTeacherStudents").mockResolvedValue({
      students: [],
      page: 2,
      pageSize: 20,
      total: 0,
      totalPages: 0,
      sort: { field: "points", direction: "desc" },
    });
    const { wrapper } = setup();

    const { result } = renderHook(() => useTeacherStudents({ sort: "points", page: 2 }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchStudents).toHaveBeenCalledWith({ sort: "points", page: 2 });
  });

  it("ends the session on a 401 and does not retry a 404", async () => {
    const fetchStudent = vi
      .spyOn(api, "fetchTeacherStudent")
      .mockRejectedValue(new ApiError("Unauthenticated", 401));
    const { client, wrapper } = setup();
    client.setQueryData(CURRENT_USER_QUERY_KEY, { id: "t" });

    const { result } = renderHook(() => useTeacherStudent("abc"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchStudent).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toBeNull();
  });
});
