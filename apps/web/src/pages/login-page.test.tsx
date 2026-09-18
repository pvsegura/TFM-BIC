import { renderWithProviders } from "@tfm-bic/testing";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as authApi from "../services/auth-api.js";
import { LoginPage } from "./login-page.js";

function renderPage(initialEntries: string[] = ["/login"]) {
  const Stub = createRoutesStub([
    { path: "/login", Component: LoginPage },
    { path: "/register", Component: () => <p>Register page</p> },
    { path: "/forgot-password", Component: () => <p>Forgot password page</p> },
    { path: "/dashboard", Component: () => <p>Dashboard page</p> },
  ]);
  return renderWithProviders(<Stub initialEntries={initialEntries} />);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LoginPage", () => {
  it("navigates to /dashboard after a successful login", async () => {
    vi.spyOn(authApi, "login").mockResolvedValue({
      id: "1",
      email: "user@example.com",
      role: "STUDENT",
      emailVerified: true,
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
  });

  it("shows a generic error message for invalid credentials without navigating", async () => {
    vi.spyOn(authApi, "login").mockRejectedValue(new ApiError("Invalid email or password.", 401));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
  });

  it("shows a validation error for an empty email without calling the API", async () => {
    const loginSpy = vi.spyOn(authApi, "login");
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it("links to registration and password reset", () => {
    renderPage();

    expect(screen.getByRole("link", { name: /register/i })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: /forgot.*password/i })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });
});
