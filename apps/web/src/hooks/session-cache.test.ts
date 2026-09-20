import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { ApiError } from "../services/api-error.js";
import { clearUserScopedCache, endSessionIfUnauthorized } from "./session-cache.js";
import { CURRENT_USER_QUERY_KEY } from "./use-current-user.js";

const USER = { id: "1", email: "a@example.com", role: "STUDENT", emailVerified: true } as const;

function seededClient() {
  const client = new QueryClient();
  client.setQueryData(CURRENT_USER_QUERY_KEY, USER);
  client.setQueryData(["profile", "me"], { firstName: "Ana" });
  client.setQueryData(["lessons", "list"], [1, 2, 3]);
  return client;
}

describe("clearUserScopedCache", () => {
  it("removes every cached query except the auth query", () => {
    const client = seededClient();

    clearUserScopedCache(client);

    expect(client.getQueryData(["profile", "me"])).toBeUndefined();
    expect(client.getQueryData(["lessons", "list"])).toBeUndefined();
    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toEqual(USER);
  });

  it("is a no-op on an empty cache", () => {
    expect(() => clearUserScopedCache(new QueryClient())).not.toThrow();
  });
});

describe("endSessionIfUnauthorized", () => {
  it("on a 401, marks the user signed out and drops user-scoped data", () => {
    const client = seededClient();

    endSessionIfUnauthorized(client, new ApiError("Unauthenticated", 401));

    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toBeNull();
    expect(client.getQueryData(["profile", "me"])).toBeUndefined();
  });

  it.each([400, 403, 500])("leaves the session alone for a %i", (status) => {
    const client = seededClient();

    endSessionIfUnauthorized(client, new ApiError("nope", status));

    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toEqual(USER);
    expect(client.getQueryData(["profile", "me"])).toEqual({ firstName: "Ana" });
  });

  it("leaves the session alone for a non-API error such as a network failure", () => {
    const client = seededClient();

    endSessionIfUnauthorized(client, new TypeError("Failed to fetch"));

    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toEqual(USER);
  });
});
