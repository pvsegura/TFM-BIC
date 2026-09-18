import { renderWithProviders } from "@tfm-bic/testing";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as authApi from "../services/auth-api.js";
import { RegisterPage } from "./register-page.js";

function renderPage() {
  const Stub = createRoutesStub([
    { path: "/register", Component: RegisterPage },
    { path: "/login", Component: () => <p>Login page</p> },
  ]);
  return renderWithProviders(<Stub initialEntries={["/register"]} />);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RegisterPage", () => {
  it("shows a validation error for an invalid email without calling the API", async () => {
    const registerSpy = vi.spyOn(authApi, "register");
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "a-good-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/valid email/i);
    expect(registerSpy).not.toHaveBeenCalled();
  });

  it("shows a validation error for a too-short password", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/8 characters/i);
  });

  it("shows the server's generic message after a successful submission", async () => {
    vi.spyOn(authApi, "register").mockResolvedValue({
      message: "If this email address can be registered, we've sent a verification link to it.",
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "a-good-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText(
        "If this email address can be registered, we've sent a verification link to it.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the server's error message when registration fails", async () => {
    vi.spyOn(authApi, "register").mockRejectedValue(new ApiError("Invalid request body.", 400));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "a-good-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid request body.");
  });

  it("links to the login page", () => {
    renderPage();

    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute("href", "/login");
  });
});
