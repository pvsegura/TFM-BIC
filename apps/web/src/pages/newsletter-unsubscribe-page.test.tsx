import { renderWithProviders } from "@tfm-bic/testing";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as emailApi from "../services/email-preferences-api.js";
import { NewsletterUnsubscribePage } from "./newsletter-unsubscribe-page.js";

function renderPage(search: string) {
  const Stub = createRoutesStub([
    { path: "/newsletter/unsubscribe", Component: NewsletterUnsubscribePage },
  ]);
  return renderWithProviders(<Stub initialEntries={[`/newsletter/unsubscribe${search}`]} />);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NewsletterUnsubscribePage", () => {
  it("asks for one click, without a login, and does nothing before it", () => {
    const unsubscribe = vi.spyOn(emailApi, "unsubscribeWithToken");

    renderPage("?token=k.sig");

    expect(screen.getByRole("button", { name: "Unsubscribe" })).toBeInTheDocument();
    expect(screen.getByText(/essential account emails/i)).toBeInTheDocument();
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("unsubscribes with the token and confirms it", async () => {
    vi.spyOn(emailApi, "unsubscribeWithToken").mockResolvedValue();
    const user = userEvent.setup();
    renderPage("?token=k.sig");

    await user.click(screen.getByRole("button", { name: "Unsubscribe" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/you have been unsubscribed/i);
    expect(vi.mocked(emailApi.unsubscribeWithToken).mock.calls[0]?.[0]).toBe("k.sig");
  });

  it("shows the server's message for an invalid link", async () => {
    vi.spyOn(emailApi, "unsubscribeWithToken").mockRejectedValue(
      new ApiError("This link is invalid or has already been used.", 400),
    );
    const user = userEvent.setup();
    renderPage("?token=forged");

    await user.click(screen.getByRole("button", { name: "Unsubscribe" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid/i);
  });

  it("says the link is invalid when it has no token", () => {
    renderPage("");

    expect(screen.getByRole("alert")).toHaveTextContent(/invalid/i);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
