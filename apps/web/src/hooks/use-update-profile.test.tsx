import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as profileApi from "../services/profile-api.js";
import { PROFILE_QUERY_KEY } from "./use-current-profile.js";
import { CURRENT_USER_QUERY_KEY } from "./use-current-user.js";
import { useUpdateProfile } from "./use-update-profile.js";

const BEFORE = {
  userId: "user-1",
  firstName: "Ana",
  lastName: null,
  nickname: null,
  avatarId: null,
  email: "ana@example.com",
  role: "STUDENT",
} as const;

const AFTER = { ...BEFORE, firstName: "Anna", nickname: "anita" };

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(PROFILE_QUERY_KEY, BEFORE);
  client.setQueryData(CURRENT_USER_QUERY_KEY, { id: "user-1" });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useUpdateProfile", () => {
  it("replaces the cached profile with what the server persisted, not what was submitted", async () => {
    // The server may normalize (e.g. trim) — the cache must hold its answer.
    vi.spyOn(profileApi, "updateProfile").mockResolvedValue(AFTER);
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    result.current.mutate({ firstName: "  Anna  " });

    await waitFor(() => {
      expect(client.getQueryData(PROFILE_QUERY_KEY)).toEqual(AFTER);
    });
  });

  it("sends the request through the profile API", async () => {
    const spy = vi.spyOn(profileApi, "updateProfile").mockResolvedValue(AFTER);
    const { wrapper } = setup();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    result.current.mutate({ nickname: "anita" });

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
    // TanStack Query v5 passes a context object as a second argument.
    expect(spy.mock.calls[0]?.[0]).toEqual({ nickname: "anita" });
  });

  it("leaves the cached profile untouched when the save fails", async () => {
    vi.spyOn(profileApi, "updateProfile").mockRejectedValue(
      new ApiError("Invalid request body.", 400, { nickname: "Enter 2–30 characters." }),
    );
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    result.current.mutate({ nickname: "x" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(client.getQueryData(PROFILE_QUERY_KEY)).toEqual(BEFORE);
    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toEqual({ id: "user-1" });
  });

  it("ends the session when the save is rejected as unauthenticated", async () => {
    vi.spyOn(profileApi, "updateProfile").mockRejectedValue(new ApiError("Unauthenticated", 401));
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    result.current.mutate({ firstName: "Anna" });

    await waitFor(() => {
      expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toBeNull();
    });
  });
});
