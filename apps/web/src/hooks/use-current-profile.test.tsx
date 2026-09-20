import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as profileApi from "../services/profile-api.js";
import { PROFILE_QUERY_KEY, useCurrentProfile } from "./use-current-profile.js";
import { CURRENT_USER_QUERY_KEY } from "./use-current-user.js";

const PROFILE = {
  userId: "user-1",
  firstName: "Ana",
  lastName: null,
  nickname: null,
  avatarId: null,
  email: "ana@example.com",
  role: "STUDENT",
} as const;

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useCurrentProfile", () => {
  it("loads the profile from the API and caches it under the profile key", async () => {
    vi.spyOn(profileApi, "fetchCurrentProfile").mockResolvedValue(PROFILE);
    const { client, wrapper } = setup();

    const { result } = renderHook(() => useCurrentProfile(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(PROFILE);
    });
    expect(client.getQueryData(PROFILE_QUERY_KEY)).toEqual(PROFILE);
  });

  it("ends the session when the API says the user is no longer authenticated", async () => {
    vi.spyOn(profileApi, "fetchCurrentProfile").mockRejectedValue(
      new ApiError("Unauthenticated", 401),
    );
    const { client, wrapper } = setup();
    client.setQueryData(CURRENT_USER_QUERY_KEY, { id: "user-1" });

    const { result } = renderHook(() => useCurrentProfile(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toBeNull();
  });

  it("keeps the session for any other failure, exposing the error for a retry", async () => {
    vi.spyOn(profileApi, "fetchCurrentProfile").mockRejectedValue(
      new ApiError("Internal Server Error", 500),
    );
    const { client, wrapper } = setup();
    client.setQueryData(CURRENT_USER_QUERY_KEY, { id: "user-1" });

    const { result } = renderHook(() => useCurrentProfile(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toEqual({ id: "user-1" });
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it("does not refetch just because the window regained focus (avoids clobbering an edit)", async () => {
    const spy = vi.spyOn(profileApi, "fetchCurrentProfile").mockResolvedValue(PROFILE);
    const { wrapper } = setup();

    const { result } = renderHook(() => useCurrentProfile(), { wrapper });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
