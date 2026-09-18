import { renderWithProviders } from "@tfm-bic/testing";
import { screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as authApi from "../services/auth-api.js";
import { VerifyEmailPage } from "./verify-email-page.js";

function renderPage(search: string) {
  const Stub = createRoutesStub([{ path: "/verify-email", Component: VerifyEmailPage }]);
  return renderWithProviders(<Stub initialEntries={[`/verify-email${search}`]} />);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("VerifyEmailPage", () => {
  it("shows a success message once verification completes", async () => {
    vi.spyOn(authApi, "verifyEmail").mockResolvedValue({ message: "Email verified." });

    renderPage("?token=raw-token");

    expect(await screen.findByText("Email verified.")).toBeInTheDocument();
    expect(vi.mocked(authApi.verifyEmail).mock.calls[0]?.[0]).toEqual({ token: "raw-token" });
  });

  it("shows the server's error message when the token is invalid or expired", async () => {
    vi.spyOn(authApi, "verifyEmail").mockRejectedValue(new ApiError("This link has expired.", 400));

    renderPage("?token=expired-token");

    expect(await screen.findByRole("alert")).toHaveTextContent("This link has expired.");
  });

  it("shows an invalid-link message when there is no token in the URL", () => {
    const verifySpy = vi.spyOn(authApi, "verifyEmail");

    renderPage("");

    expect(screen.getByRole("alert")).toHaveTextContent(/invalid/i);
    expect(verifySpy).not.toHaveBeenCalled();
  });
});
