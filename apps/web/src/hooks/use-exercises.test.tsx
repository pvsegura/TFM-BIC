import type {
  ExerciseAnswerResponse,
  ExerciseListResponse,
  ExerciseResponse,
} from "@tfm-bic/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as exercisesApi from "../services/exercises-api.js";
import { clearUserScopedCache } from "./session-cache.js";
import { CURRENT_USER_QUERY_KEY } from "./use-current-user.js";
import {
  EXERCISES_QUERY_KEY_ROOT,
  useExercise,
  useLessonExercises,
  useSubmitAnswer,
} from "./use-exercises.js";

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

const UNANSWERED = { status: "unanswered", attemptCount: 0, lastAnsweredAt: null } as const;
const CORRECT = {
  status: "correct",
  attemptCount: 1,
  lastAnsweredAt: "2026-01-01T10:00:00.000Z",
} as const;

const SUMMARY = {
  id: "pl-greetings-hello",
  lessonId: "pl-greetings",
  languageId: "pl",
  levelId: "a1",
  type: "true-false",
  order: 10,
  prompt: "Cześć is informal.",
  instructionLanguage: "en",
  result: UNANSWERED,
};
// Branded ids are plain strings at runtime; the API client validates them for real.
const LIST = {
  exercises: [SUMMARY],
  progress: { total: 1, answered: 0 },
} as unknown as ExerciseListResponse;
const EXERCISE = {
  ...SUMMARY,
  type: "true-false",
} as unknown as ExerciseResponse;
const EVALUATION: ExerciseAnswerResponse = {
  correct: true,
  feedback: "Yes.",
  correctAnswer: true,
  result: CORRECT,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useLessonExercises", () => {
  it("loads a lesson's exercises under a user-scoped key", async () => {
    const spy = vi.spyOn(exercisesApi, "fetchLessonExercises").mockResolvedValue(LIST);
    const { client, wrapper } = setup();

    const { result } = renderHook(() => useLessonExercises("pl-greetings"), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(LIST);
    });
    expect(spy).toHaveBeenCalledWith("pl-greetings");
    expect(client.getQueryCache().getAll()[0]?.queryKey.slice(0, 3)).toEqual([
      EXERCISES_QUERY_KEY_ROOT,
      "list",
      "pl-greetings",
    ]);
  });

  it("stays idle until a lesson id is known", () => {
    const spy = vi.spyOn(exercisesApi, "fetchLessonExercises").mockResolvedValue(LIST);
    const { wrapper } = setup();

    const { result } = renderHook(() => useLessonExercises(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not retry, so a not-found shows straight away", async () => {
    const spy = vi
      .spyOn(exercisesApi, "fetchLessonExercises")
      .mockRejectedValue(new ApiError("Lesson not found.", 404));
    const { wrapper } = setup();

    const { result } = renderHook(() => useLessonExercises("pl-nope"), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("records that the session is gone when the API answers 401", async () => {
    vi.spyOn(exercisesApi, "fetchLessonExercises").mockRejectedValue(
      new ApiError("Unauthenticated", 401),
    );
    const { client, wrapper } = setup();
    client.setQueryData(CURRENT_USER_QUERY_KEY, { id: "u1" });

    const { result } = renderHook(() => useLessonExercises("pl-greetings"), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toBeNull();
  });
});

describe("useExercise", () => {
  it("loads one exercise under a user-scoped key", async () => {
    const spy = vi.spyOn(exercisesApi, "fetchExercise").mockResolvedValue(EXERCISE);
    const { client, wrapper } = setup();

    const { result } = renderHook(() => useExercise("pl-greetings-hello"), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(EXERCISE);
    });
    expect(spy).toHaveBeenCalledWith("pl-greetings-hello");
    expect(client.getQueryCache().getAll()[0]?.queryKey.slice(0, 3)).toEqual([
      EXERCISES_QUERY_KEY_ROOT,
      "detail",
      "pl-greetings-hello",
    ]);
  });

  it("stays idle without an id", () => {
    const spy = vi.spyOn(exercisesApi, "fetchExercise").mockResolvedValue(EXERCISE);
    const { wrapper } = setup();

    const { result } = renderHook(() => useExercise(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(spy).not.toHaveBeenCalled();
  });

  it("is dropped with the rest of the user's data when the session changes", async () => {
    vi.spyOn(exercisesApi, "fetchExercise").mockResolvedValue(EXERCISE);
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useExercise("pl-greetings-hello"), { wrapper });
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    clearUserScopedCache(client);

    expect(client.getQueryCache().getAll()).toEqual([]);
  });
});

describe("useSubmitAnswer", () => {
  it("sends only the exercise id and the answer, and exposes the server's verdict", async () => {
    const spy = vi.spyOn(exercisesApi, "submitAnswer").mockResolvedValue(EVALUATION);
    const { wrapper } = setup();
    const { result } = renderHook(() => useSubmitAnswer(), { wrapper });

    act(() => {
      result.current.mutate({ exerciseId: "pl-greetings-hello", answer: true });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(EVALUATION);
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("pl-greetings-hello", true);
  });

  it("writes the persisted result into the cached exercise, without another request", async () => {
    vi.spyOn(exercisesApi, "submitAnswer").mockResolvedValue(EVALUATION);
    const fetchExercise = vi.spyOn(exercisesApi, "fetchExercise").mockResolvedValue(EXERCISE);
    const { client, wrapper } = setup();
    const detail = renderHook(() => useExercise("pl-greetings-hello"), { wrapper });
    await waitFor(() => {
      expect(detail.result.current.data).toBeDefined();
    });
    const { result } = renderHook(() => useSubmitAnswer(), { wrapper });

    act(() => {
      result.current.mutate({ exerciseId: "pl-greetings-hello", answer: true });
    });

    await waitFor(() => {
      expect(detail.result.current.data?.result).toEqual(CORRECT);
    });
    expect(fetchExercise).toHaveBeenCalledTimes(1);
    expect(
      client.getQueryData<ExerciseResponse>([
        EXERCISES_QUERY_KEY_ROOT,
        "detail",
        "pl-greetings-hello",
      ])?.result,
    ).toEqual(CORRECT);
  });

  it("marks every cached exercise list stale, so the next look shows what the server persisted", async () => {
    vi.spyOn(exercisesApi, "submitAnswer").mockResolvedValue(EVALUATION);
    const fetchList = vi.spyOn(exercisesApi, "fetchLessonExercises").mockResolvedValue(LIST);
    const { wrapper } = setup();
    const list = renderHook(() => useLessonExercises("pl-greetings"), { wrapper });
    await waitFor(() => {
      expect(list.result.current.data).toBeDefined();
    });
    const { result } = renderHook(() => useSubmitAnswer(), { wrapper });

    act(() => {
      result.current.mutate({ exerciseId: "pl-greetings-hello", answer: true });
    });

    await waitFor(() => {
      expect(fetchList).toHaveBeenCalledTimes(2);
    });
  });

  it("keeps one request in flight: a double-click sends a single answer", async () => {
    let settle!: (value: ExerciseAnswerResponse) => void;
    const spy = vi.spyOn(exercisesApi, "submitAnswer").mockImplementation(
      () =>
        new Promise<ExerciseAnswerResponse>((resolve) => {
          settle = resolve;
        }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useSubmitAnswer(), { wrapper });

    act(() => {
      result.current.mutate({ exerciseId: "pl-greetings-hello", answer: true });
      result.current.mutate({ exerciseId: "pl-greetings-hello", answer: true });
    });
    // The mutation function starts a moment after the click; wait for it before answering it.
    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1);
    });
    act(() => {
      settle(EVALUATION);
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("frees the lock when a request settles, so a retry can be submitted", async () => {
    const spy = vi.spyOn(exercisesApi, "submitAnswer").mockResolvedValue(EVALUATION);
    const { wrapper } = setup();
    const { result } = renderHook(() => useSubmitAnswer(), { wrapper });

    act(() => {
      result.current.mutate({ exerciseId: "pl-greetings-hello", answer: true });
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    act(() => {
      result.current.reset();
      result.current.mutate({ exerciseId: "pl-greetings-hello", answer: false });
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(2);
    });
    expect(spy).toHaveBeenLastCalledWith("pl-greetings-hello", false);
  });

  it("frees the lock after a failure, so the student can try again", async () => {
    const spy = vi
      .spyOn(exercisesApi, "submitAnswer")
      .mockRejectedValueOnce(new ApiError("Something went wrong. Please try again.", 500))
      .mockResolvedValueOnce(EVALUATION);
    const { wrapper } = setup();
    const { result } = renderHook(() => useSubmitAnswer(), { wrapper });

    act(() => {
      result.current.mutate({ exerciseId: "pl-greetings-hello", answer: true });
    });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    act(() => {
      result.current.mutate({ exerciseId: "pl-greetings-hello", answer: true });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("records that the session is gone when the API answers 401", async () => {
    vi.spyOn(exercisesApi, "submitAnswer").mockRejectedValue(new ApiError("Unauthenticated", 401));
    const { client, wrapper } = setup();
    client.setQueryData(CURRENT_USER_QUERY_KEY, { id: "u1" });
    const { result } = renderHook(() => useSubmitAnswer(), { wrapper });

    act(() => {
      result.current.mutate({ exerciseId: "pl-greetings-hello", answer: true });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toBeNull();
  });
});
