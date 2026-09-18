import { renderWithProviders } from "@tfm-bic/testing";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as authApi from "../services/auth-api.js";
import { ForgotPasswordPage } from "./forgot-password-page.js";

function renderPage() {
  const Stub = createRoutesStub([
    { path: "/forgot-password", Component: ForgotPasswordPage },
    { path: "/login", Component: () => <p>Login page</p> },
  ]);
  return renderWithProviders(<Stub initialEntries={["/forgot-password"]} />);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ForgotPasswordPage", () => {
  it("shows the server's generic message after submitting, regardless of account existence", async () => {
    vi.spyOn(authApi, "requestPasswordReset").mockResolvedValue({
      message: "If this email address has an account, we've sent a password reset link to it.",
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(
      await screen.findByText(
        "If this email address has an account, we've sent a password reset link to it.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a validation error for an invalid email without calling the API", async () => {
    const spy = vi.spyOn(authApi, "requestPasswordReset");
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("links back to login", () => {
    renderPage();

    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute("href", "/login");
  });
});
