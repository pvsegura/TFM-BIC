import { renderWithProviders } from "@tfm-bic/testing";
import { screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as authApi from "../services/auth-api.js";
import { ProtectedRoute } from "./protected-route.js";

function renderProtected() {
  const Stub = createRoutesStub([
    {
      path: "/dashboard",
      Component: ProtectedRoute,
      children: [{ index: true, Component: () => <p>Protected content</p> }],
    },
    { path: "/login", Component: () => <p>Login page</p> },
  ]);
  return renderWithProviders(<Stub initialEntries={["/dashboard"]} />);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ProtectedRoute", () => {
  it("shows a loading state while auth is being restored, without redirecting", () => {
    vi.spyOn(authApi, "fetchCurrentUser").mockReturnValue(
      new Promise(() => {
        /* never resolves — simulates the "still loading" state */
      }),
    );

    renderProtected();

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("redirects to /login when there is no authenticated user", async () => {
    vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);

    renderProtected();

    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });

  it("renders the protected content when authenticated", async () => {
    vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({
      id: "1",
      email: "user@example.com",
      role: "STUDENT",
      emailVerified: true,
    });

    renderProtected();

    expect(await screen.findByText("Protected content")).toBeInTheDocument();
  });
});
