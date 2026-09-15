import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

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

  return render(<Stub initialEntries={["/"]} />);
}

describe("RootLayout", () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: "light" });
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("renders the primary navigation with links to every top-level public route", () => {
    renderRootLayout();

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute("href", "/register");
  });

  it("renders the routed child content via Outlet", () => {
    renderRootLayout();

    expect(screen.getByText("Home content")).toBeInTheDocument();
  });

  it("toggles the .dark class on <html> when the theme button is activated", async () => {
    const user = userEvent.setup();
    renderRootLayout();

    expect(document.documentElement).not.toHaveClass("dark");

    await user.click(screen.getByRole("button", { name: "Toggle dark mode" }));
    expect(document.documentElement).toHaveClass("dark");

    await user.click(screen.getByRole("button", { name: "Toggle dark mode" }));
    expect(document.documentElement).not.toHaveClass("dark");
  });
});
