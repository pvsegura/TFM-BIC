import { renderWithProviders } from "@tfm-bic/testing";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as authApi from "../services/auth-api.js";
import { useThemeStore } from "../state/theme-store.js";
import { RootLayout } from "./root-layout.js";

function renderRootLayout() {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: RootLayout,
      children: [{ index: true, Component: () => <p>Home content</p> }],
    },
  ]);

  return renderWithProviders(<Stub initialEntries={["/"]} />);
}

describe("RootLayout", () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: "light" });
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders login/register links when no session is restored", async () => {
    vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);
    renderRootLayout();

    expect(await screen.findByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute("href", "/register");
  });

  it("renders the current user's email and a log-out control when authenticated", async () => {
    vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({
      id: "1",
      email: "user@example.com",
      role: "STUDENT",
      emailVerified: true,
    });
    renderRootLayout();

    expect(await screen.findByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
  });

  it("renders the routed child content via Outlet", async () => {
    vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);
    renderRootLayout();

    expect(await screen.findByText("Home content")).toBeInTheDocument();
  });

  it("toggles the .dark class on <html> when the theme button is activated", async () => {
    vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);
    const user = userEvent.setup();
    renderRootLayout();

    expect(document.documentElement).not.toHaveClass("dark");

    await user.click(screen.getByRole("button", { name: "Toggle dark mode" }));
    expect(document.documentElement).toHaveClass("dark");

    await user.click(screen.getByRole("button", { name: "Toggle dark mode" }));
    expect(document.documentElement).not.toHaveClass("dark");
  });
});
