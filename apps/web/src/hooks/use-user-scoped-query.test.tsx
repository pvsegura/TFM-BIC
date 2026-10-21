import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import { CURRENT_USER_QUERY_KEY } from "./use-current-user.js";
import { useUserScopedQuery } from "./use-user-scoped-query.js";

function render<T>(request: (() => Promise<T>) | undefined) {
  const client = new QueryClient();
  client.setQueryData(CURRENT_USER_QUERY_KEY, { id: "u1" });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useUserScopedQuery(["test", "key"], request), { wrapper });
  return { ...hook, client };
}

describe("useUserScopedQuery", () => {
  it("stays idle while there is nothing to ask for", () => {
    const { result } = render(undefined);

    expect(result.current.fetchStatus).toBe("idle");
  });

  it("returns the data", async () => {
    const { result } = render(() => Promise.resolve({ ok: true }));

    await waitFor(() => expect(result.current.data).toEqual({ ok: true }));
  });

  it("ends the session on a 401, once — no retry", async () => {
    const request = vi.fn().mockRejectedValue(new ApiError("Not signed in.", 401));
    const { result, client } = render(request);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(request).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toBeNull();
  });

  it("keeps the session on another error", async () => {
    const { result, client } = render(() => Promise.reject(new ApiError("Server error.", 500)));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toEqual({ id: "u1" });
  });
});
