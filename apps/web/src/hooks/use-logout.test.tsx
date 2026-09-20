import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as authApi from "../services/auth-api.js";
import { CURRENT_USER_QUERY_KEY } from "./use-current-user.js";
import { useLogin } from "./use-login.js";
import { useLogout } from "./use-logout.js";

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

describe("useLogout", () => {
  it("signs the user out and drops the previous user's cached data", async () => {
    vi.spyOn(authApi, "logout").mockResolvedValue();
    const { client, wrapper } = setup();
    client.setQueryData(CURRENT_USER_QUERY_KEY, { id: "a" });
    client.setQueryData(["profile", "me"], { firstName: "Ana" });
    const { result } = renderHook(() => useLogout(), { wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toBeNull();
    });
    expect(client.getQueryData(["profile", "me"])).toBeUndefined();
  });
});

describe("useLogin", () => {
  it("never lets a previous user's cached data survive into the new session", async () => {
    vi.spyOn(authApi, "login").mockResolvedValue({
      id: "b",
      email: "b@example.com",
      role: "STUDENT",
      emailVerified: true,
    });
    const { client, wrapper } = setup();
    client.setQueryData(["profile", "me"], { firstName: "Ana (previous user)" });
    const { result } = renderHook(() => useLogin(), { wrapper });

    result.current.mutate({ email: "b@example.com", password: "a-good-password" });

    await waitFor(() => {
      expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toMatchObject({ id: "b" });
    });
    expect(client.getQueryData(["profile", "me"])).toBeUndefined();
  });
});
