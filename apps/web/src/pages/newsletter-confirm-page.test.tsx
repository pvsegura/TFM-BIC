import { renderWithProviders } from "@tfm-bic/testing";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as emailApi from "../services/email-preferences-api.js";
import { NewsletterConfirmPage } from "./newsletter-confirm-page.js";

function renderPage(search: string) {
  const Stub = createRoutesStub([
    { path: "/newsletter/confirm", Component: NewsletterConfirmPage },
  ]);
  return renderWithProviders(<Stub initialEntries={[`/newsletter/confirm${search}`]} />);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NewsletterConfirmPage", () => {
  it("does nothing until the user clicks — link scanners must not confirm consent", async () => {
    const confirm = vi.spyOn(emailApi, "confirmNewsletterSubscription");

    renderPage("?token=tok");

    expect(await screen.findByRole("button", { name: "Confirm subscription" })).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("confirms with the token on click", async () => {
    vi.spyOn(emailApi, "confirmNewsletterSubscription").mockResolvedValue({
      status: "subscribed",
      since: "2026-09-26T10:00:00.000Z",
    });
    const user = userEvent.setup();
    renderPage("?token=tok");

    await user.click(screen.getByRole("button", { name: "Confirm subscription" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/subscription is confirmed/i);
    expect(vi.mocked(emailApi.confirmNewsletterSubscription).mock.calls[0]?.[0]).toBe("tok");
    expect(screen.queryByRole("button", { name: "Confirm subscription" })).toBeNull();
  });

  it("shows the server's message for an expired or used link", async () => {
    vi.spyOn(emailApi, "confirmNewsletterSubscription").mockRejectedValue(
      new ApiError("This confirmation link has expired.", 410),
    );
    const user = userEvent.setup();
    renderPage("?token=old");

    await user.click(screen.getByRole("button", { name: "Confirm subscription" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/expired/i);
  });

  it("says the link is invalid when it has no token", () => {
    renderPage("");

    expect(screen.getByRole("alert")).toHaveTextContent(/invalid/i);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
