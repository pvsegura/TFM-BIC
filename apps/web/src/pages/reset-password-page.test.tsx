import { renderWithProviders } from "@tfm-bic/testing";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as authApi from "../services/auth-api.js";
import { ResetPasswordPage } from "./reset-password-page.js";

function renderPage(search: string) {
  const Stub = createRoutesStub([
    { path: "/reset-password", Component: ResetPasswordPage },
    { path: "/login", Component: () => <p>Login page</p> },
  ]);
  return renderWithProviders(<Stub initialEntries={[`/reset-password${search}`]} />);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ResetPasswordPage", () => {
  it("shows an invalid-link message when there is no token in the URL", () => {
    renderPage("");

    expect(screen.getByRole("alert")).toHaveTextContent(/invalid/i);
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
  });

  it("submits the token from the URL with the entered password", async () => {
    vi.spyOn(authApi, "confirmPasswordReset").mockResolvedValue({
      message: "Password updated. Please log in again.",
    });
    const user = userEvent.setup();
    renderPage("?token=raw-reset-token");

    await user.type(screen.getByLabelText(/new password/i), "a-new-good-password");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(vi.mocked(authApi.confirmPasswordReset).mock.calls[0]?.[0]).toEqual({
      token: "raw-reset-token",
      newPassword: "a-new-good-password",
    });
    expect(await screen.findByText("Password updated. Please log in again.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute("href", "/login");
  });

  it("shows a validation error for a too-short password without calling the API", async () => {
    const spy = vi.spyOn(authApi, "confirmPasswordReset");
    const user = userEvent.setup();
    renderPage("?token=raw-reset-token");

    await user.type(screen.getByLabelText(/new password/i), "short");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/8 characters/i);
    expect(spy).not.toHaveBeenCalled();
  });

  it("shows the server's error message when the token is expired or reused", async () => {
    vi.spyOn(authApi, "confirmPasswordReset").mockRejectedValue(
      new ApiError("This link has already been used.", 400),
    );
    const user = userEvent.setup();
    renderPage("?token=raw-reset-token");

    await user.type(screen.getByLabelText(/new password/i), "a-new-good-password");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This link has already been used.");
  });
});
