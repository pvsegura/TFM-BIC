import { renderWithProviders } from "@tfm-bic/testing";
import { screen, within } from "@testing-library/react";
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

  it("links to the privacy notice from every page, signed in or not (M15)", async () => {
    vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);
    renderRootLayout();

    const footer = await screen.findByRole("contentinfo");
    expect(footer).toContainElement(screen.getByRole("link", { name: "Privacy notice" }));
    expect(screen.getByRole("link", { name: "Privacy notice" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });

  it("links to the public language/level discovery page whether or not anyone is signed in", async () => {
    vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);
    renderRootLayout();

    expect(await screen.findByRole("link", { name: "Learn" })).toHaveAttribute("href", "/learn");
  });

  it("links to the student's lessons only when signed in — it is not offered to visitors", async () => {
    const spy = vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);
    const { unmount } = renderRootLayout();
    await screen.findByRole("link", { name: "Log in" });
    expect(screen.queryByRole("link", { name: "Lessons" })).not.toBeInTheDocument();
    unmount();

    spy.mockResolvedValue({
      id: "1",
      email: "user@example.com",
      role: "STUDENT",
      emailVerified: true,
    });
    renderRootLayout();

    expect(await screen.findByRole("link", { name: "Lessons" })).toHaveAttribute(
      "href",
      "/learn/lessons",
    );
  });

  it("links to the dashboard and the achievements only when signed in", async () => {
    const spy = vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);
    const { unmount } = renderRootLayout();
    await screen.findByRole("link", { name: "Log in" });
    expect(screen.queryByRole("link", { name: "Achievements" })).not.toBeInTheDocument();
    unmount();

    spy.mockResolvedValue({
      id: "1",
      email: "user@example.com",
      role: "STUDENT",
      emailVerified: true,
    });
    renderRootLayout();

    expect(await screen.findByRole("link", { name: "Achievements" })).toHaveAttribute(
      "href",
      "/achievements",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
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

  it("links to the profile page when authenticated", async () => {
    vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({
      id: "1",
      email: "user@example.com",
      role: "STUDENT",
      emailVerified: true,
    });
    renderRootLayout();

    expect(await screen.findByRole("link", { name: "Profile" })).toHaveAttribute(
      "href",
      "/profile",
    );
  });

  it("offers the teacher dashboard link to a teacher only (the API is still the real boundary)", async () => {
    const spy = vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({
      id: "1",
      email: "teacher@example.com",
      role: "TEACHER",
      emailVerified: true,
    });
    const { unmount } = renderRootLayout();
    expect(await screen.findByRole("link", { name: "Teaching" })).toHaveAttribute(
      "href",
      "/teacher",
    );
    unmount();

    spy.mockResolvedValue({
      id: "2",
      email: "s@example.com",
      role: "STUDENT",
      emailVerified: true,
    });
    renderRootLayout();
    await screen.findByRole("link", { name: "Profile" });
    expect(screen.queryByRole("link", { name: "Teaching" })).not.toBeInTheDocument();
  });

  it("does not offer the profile link to an anonymous visitor", async () => {
    vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);
    renderRootLayout();

    await screen.findByRole("link", { name: "Log in" });
    expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
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

describe("RootLayout — M20A public homepage support", () => {
  beforeEach(() => {
    vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderAt(path: string, handle?: { fullBleed: boolean }) {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: RootLayout,
        children: [
          { index: true, Component: () => <p>Home content</p>, handle },
          { path: "elsewhere", Component: () => <p>Elsewhere</p> },
        ],
      },
    ]);
    return renderWithProviders(<Stub initialEntries={[path]} />);
  }

  it("keeps the usual centred column unless the route asks for a full-bleed page", async () => {
    const { unmount } = renderAt("/");
    await screen.findByText("Home content");
    expect(screen.getByRole("main")).not.toHaveAttribute("data-layout", "full-bleed");
    unmount();

    renderAt("/", { fullBleed: true });
    await screen.findByText("Home content");
    expect(screen.getByRole("main")).toHaveAttribute("data-layout", "full-bleed");
  });

  it("has a menu button that discloses the primary links on small screens", async () => {
    const user = userEvent.setup();
    renderAt("/");
    const menuButton = await screen.findByRole("button", { name: "Menu" });

    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    const controlled = document.getElementById(menuButton.getAttribute("aria-controls") ?? "");
    expect(controlled).toContainElement(screen.getByRole("link", { name: "Log in" }));

    await user.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton).toHaveFocus();
  });

  it("closes the menu after following one of its links", async () => {
    const user = userEvent.setup();
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: RootLayout,
        children: [
          { index: true, Component: () => <p>Home content</p> },
          { path: "login", Component: () => <p>Login page</p> },
        ],
      },
    ]);
    renderWithProviders(<Stub initialEntries={["/"]} />);

    await user.click(await screen.findByRole("button", { name: "Menu" }));
    await user.click(screen.getByRole("link", { name: "Log in" }));

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
  });

  it("has a footer navigation with the public pages that exist, and the copyright holder", async () => {
    renderAt("/");
    const footerNav = await screen.findByRole("navigation", { name: "Footer" });

    expect(within(footerNav).getByRole("link", { name: "Languages and levels" })).toHaveAttribute(
      "href",
      "/learn",
    );
    expect(within(footerNav).getByRole("link", { name: "Privacy notice" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(screen.getByRole("contentinfo")).toHaveTextContent("© 2026 pvsegura");
  });
});
