import type {
  LessonListResponse,
  LessonProgressResponse,
  LessonResponse,
} from "@tfm-bic/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as lessonsApi from "../services/lessons-api.js";
import { CURRENT_USER_QUERY_KEY } from "./use-current-user.js";
import { clearUserScopedCache } from "./session-cache.js";
import {
  LESSONS_QUERY_KEY_ROOT,
  useCompleteLesson,
  useLesson,
  useLessons,
  useStartLesson,
} from "./use-lessons.js";

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

const NOT_STARTED: LessonProgressResponse = {
  status: "not_started",
  startedAt: null,
  completedAt: null,
};
const IN_PROGRESS: LessonProgressResponse = {
  status: "in_progress",
  startedAt: "2026-01-01T10:00:00.000Z",
  completedAt: null,
};
const COMPLETED: LessonProgressResponse = {
  status: "completed",
  startedAt: "2026-01-01T10:00:00.000Z",
  completedAt: "2026-01-01T10:05:00.000Z",
};

const SUMMARY = {
  id: "pl-greetings",
  languageId: "pl",
  levelId: "a1",
  title: "Greetings",
  description: "Say hello.",
  order: 10,
  instructionLanguage: "en",
  progress: NOT_STARTED,
};
// Branded ids (LanguageId) are plain strings at runtime; the API client validates them for real.
const LIST = { lessons: [SUMMARY] } as unknown as LessonListResponse;
const LESSON = {
  ...SUMMARY,
  blocks: [{ type: "explanation", text: "Hello." }],
} as unknown as LessonResponse;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useLessons", () => {
  it("loads the list for a language and level under a user-scoped key", async () => {
    const spy = vi.spyOn(lessonsApi, "fetchLessons").mockResolvedValue(LIST);
    const { client, wrapper } = setup();

    const { result } = renderHook(() => useLessons("pl", "a1"), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(LIST);
    });
    expect(spy).toHaveBeenCalledWith("pl", "a1");
    expect(client.getQueryCache().getAll()[0]?.queryKey.slice(0, 2)).toEqual([
      LESSONS_QUERY_KEY_ROOT,
      "list",
    ]);
  });

  it("stays idle until a language and level are known", () => {
    const spy = vi.spyOn(lessonsApi, "fetchLessons").mockResolvedValue(LIST);
    const { wrapper } = setup();

    const { result } = renderHook(() => useLessons(undefined, undefined), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(spy).not.toHaveBeenCalled();
  });

  it("treats progress as changing user data: coming back to the list refetches it", async () => {
    const spy = vi.spyOn(lessonsApi, "fetchLessons").mockResolvedValue(LIST);
    const { wrapper } = setup();
    const first = renderHook(() => useLessons("pl", "a1"), { wrapper });
    await waitFor(() => {
      expect(first.result.current.isSuccess).toBe(true);
    });
    first.unmount();

    renderHook(() => useLessons("pl", "a1"), { wrapper });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  it("records a 401 as an ended session so the protected route sends the user to log in", async () => {
    vi.spyOn(lessonsApi, "fetchLessons").mockRejectedValue(new ApiError("Unauthenticated", 401));
    const { client, wrapper } = setup();
    client.setQueryData(CURRENT_USER_QUERY_KEY, { id: "user-1" });

    const { result } = renderHook(() => useLessons("pl", "a1"), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toBeNull();
  });

  it("is dropped with the rest of the user-scoped cache on logout", async () => {
    vi.spyOn(lessonsApi, "fetchLessons").mockResolvedValue(LIST);
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useLessons("pl", "a1"), { wrapper });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    clearUserScopedCache(client);

    expect(client.getQueryCache().findAll({ queryKey: [LESSONS_QUERY_KEY_ROOT] })).toHaveLength(0);
  });
});

describe("useLesson", () => {
  it("loads one lesson", async () => {
    const spy = vi.spyOn(lessonsApi, "fetchLesson").mockResolvedValue(LESSON);
    const { wrapper } = setup();

    const { result } = renderHook(() => useLesson("pl-greetings"), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(LESSON);
    });
    expect(spy).toHaveBeenCalledWith("pl-greetings");
  });

  it("stays idle without an id", () => {
    const spy = vi.spyOn(lessonsApi, "fetchLesson").mockResolvedValue(LESSON);
    const { wrapper } = setup();

    const { result } = renderHook(() => useLesson(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(spy).not.toHaveBeenCalled();
  });

  it("records a 401 as an ended session", async () => {
    vi.spyOn(lessonsApi, "fetchLesson").mockRejectedValue(new ApiError("Unauthenticated", 401));
    const { client, wrapper } = setup();
    client.setQueryData(CURRENT_USER_QUERY_KEY, { id: "user-1" });

    const { result } = renderHook(() => useLesson("pl-greetings"), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toBeNull();
  });
});

describe.each([
  ["useStartLesson", useStartLesson, "startLesson", IN_PROGRESS],
  ["useCompleteLesson", useCompleteLesson, "completeLesson", COMPLETED],
] as const)("%s", (_name, useMutationHook, apiFn, persisted) => {
  it("puts the progress the server persisted into the cached lesson, without another request", async () => {
    vi.spyOn(lessonsApi, apiFn).mockResolvedValue(persisted);
    const detail = vi.spyOn(lessonsApi, "fetchLesson").mockResolvedValue(LESSON);
    vi.spyOn(lessonsApi, "fetchLessons").mockResolvedValue(LIST);
    const { wrapper } = setup();
    const lesson = renderHook(() => useLesson("pl-greetings"), { wrapper });
    // Reading `data` here is what subscribes this hook to changes of it.
    await waitFor(() => {
      expect(lesson.result.current.data).toEqual(LESSON);
    });
    const mutation = renderHook(() => useMutationHook(), { wrapper });

    await act(async () => {
      await mutation.result.current.mutateAsync("pl-greetings");
    });

    await waitFor(() => {
      expect(lesson.result.current.data?.progress).toEqual(persisted);
    });
    expect(detail).toHaveBeenCalledTimes(1);
  });

  it("marks every cached lesson list stale so the list reflects the server", async () => {
    vi.spyOn(lessonsApi, apiFn).mockResolvedValue(persisted);
    const list = vi.spyOn(lessonsApi, "fetchLessons").mockResolvedValue(LIST);
    const { wrapper } = setup();
    const observer = renderHook(() => useLessons("pl", "a1"), { wrapper });
    await waitFor(() => {
      expect(observer.result.current.isSuccess).toBe(true);
    });
    const mutation = renderHook(() => useMutationHook(), { wrapper });

    await act(async () => {
      await mutation.result.current.mutateAsync("pl-greetings");
    });

    await waitFor(() => {
      expect(list).toHaveBeenCalledTimes(2);
    });
  });

  it("leaves a lesson that was never cached alone", async () => {
    vi.spyOn(lessonsApi, apiFn).mockResolvedValue(persisted);
    const { client, wrapper } = setup();
    const mutation = renderHook(() => useMutationHook(), { wrapper });

    await act(async () => {
      await mutation.result.current.mutateAsync("pl-greetings");
    });

    expect(client.getQueryData([LESSONS_QUERY_KEY_ROOT, "detail", "pl-greetings"])).toBeUndefined();
  });

  it("records a 401 as an ended session and surfaces the error", async () => {
    vi.spyOn(lessonsApi, apiFn).mockRejectedValue(new ApiError("Unauthenticated", 401));
    const { client, wrapper } = setup();
    client.setQueryData(CURRENT_USER_QUERY_KEY, { id: "user-1" });
    const mutation = renderHook(() => useMutationHook(), { wrapper });

    await act(async () => {
      await mutation.result.current.mutateAsync("pl-greetings").catch(() => undefined);
    });

    await waitFor(() => {
      expect(mutation.result.current.isError).toBe(true);
    });
    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toBeNull();
  });

  it("does not end the session for an error that says nothing about it", async () => {
    vi.spyOn(lessonsApi, apiFn).mockRejectedValue(new ApiError("Lesson not found.", 404));
    const { client, wrapper } = setup();
    client.setQueryData(CURRENT_USER_QUERY_KEY, { id: "user-1" });
    const mutation = renderHook(() => useMutationHook(), { wrapper });

    await act(async () => {
      await mutation.result.current.mutateAsync("pl-greetings").catch(() => undefined);
    });

    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toEqual({ id: "user-1" });
  });
});

describe("useCompleteLesson: one request at a time", () => {
  it("ignores a second click that arrives before the first has finished — a double-click sends one request", async () => {
    let finish!: (progress: LessonProgressResponse) => void;
    const spy = vi.spyOn(lessonsApi, "completeLesson").mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useCompleteLesson(), { wrapper });

    act(() => {
      result.current.mutate("pl-greetings");
      result.current.mutate("pl-greetings");
    });
    await act(async () => {
      finish(COMPLETED);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("allows another attempt once a failed one has settled, so the student can retry", async () => {
    const spy = vi
      .spyOn(lessonsApi, "completeLesson")
      .mockRejectedValueOnce(new ApiError("Something went wrong. Please try again.", 500))
      .mockResolvedValue(COMPLETED);
    const { wrapper } = setup();
    const { result } = renderHook(() => useCompleteLesson(), { wrapper });

    act(() => {
      result.current.mutate("pl-greetings");
    });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    act(() => {
      result.current.mutate("pl-greetings");
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
