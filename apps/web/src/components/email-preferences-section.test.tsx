import type { EmailPreferencesResponse } from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as emailApi from "../services/email-preferences-api.js";
import { EmailPreferencesSection } from "./email-preferences-section.js";

function preferences(
  status: EmailPreferencesResponse["newsletter"]["status"],
  since: string | null = null,
): EmailPreferencesResponse {
  return { essential: { enabled: true, required: true }, newsletter: { status, since } };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("EmailPreferencesSection", () => {
  it("shows a loading status, then the preferences", async () => {
    vi.spyOn(emailApi, "fetchEmailPreferences").mockResolvedValue(preferences("not_subscribed"));

    renderWithProviders(<EmailPreferencesSection />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
    expect(await screen.findByRole("heading", { name: "Email preferences" })).toBeInTheDocument();
  });

  it("presents essential email as required, not as an option", async () => {
    vi.spyOn(emailApi, "fetchEmailPreferences").mockResolvedValue(preferences("not_subscribed"));

    renderWithProviders(<EmailPreferencesSection />);

    const essential = await screen.findByRole("group", { name: "Essential emails" });
    expect(essential).toHaveTextContent(/always on/i);
    expect(essential).toHaveTextContent(/verification/i);
    expect(essential.querySelector("input")).toBeNull();
  });

  it("offers the newsletter with an unticked consent box that explains what is agreed to", async () => {
    vi.spyOn(emailApi, "fetchEmailPreferences").mockResolvedValue(preferences("not_subscribed"));

    renderWithProviders(<EmailPreferencesSection />);

    const consent = await screen.findByRole("checkbox", { name: /receive the newsletter/i });
    expect(consent).not.toBeChecked();
    expect(screen.getByText(/not subscribed/i)).toBeInTheDocument();
    expect(screen.getByText(/unsubscribe at any time/i)).toBeInTheDocument();
  });

  it("refuses to subscribe until the consent box is ticked", async () => {
    vi.spyOn(emailApi, "fetchEmailPreferences").mockResolvedValue(preferences("not_subscribed"));
    const subscribe = vi.spyOn(emailApi, "subscribeToNewsletter");
    const user = userEvent.setup();
    renderWithProviders(<EmailPreferencesSection />);

    await user.click(await screen.findByRole("button", { name: "Subscribe" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/tick the box/i);
    expect(subscribe).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox", { name: /receive the newsletter/i })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("subscribes after consent and then asks the user to confirm by email", async () => {
    vi.spyOn(emailApi, "fetchEmailPreferences").mockResolvedValue(preferences("not_subscribed"));
    vi.spyOn(emailApi, "subscribeToNewsletter").mockResolvedValue({
      newsletter: { status: "pending", since: "2026-09-26T10:00:00.000Z" },
      confirmationEmailSent: true,
    });
    const user = userEvent.setup();
    renderWithProviders(<EmailPreferencesSection />);

    await user.click(await screen.findByRole("checkbox", { name: /receive the newsletter/i }));
    await user.click(screen.getByRole("button", { name: "Subscribe" }));

    expect(await screen.findByText(/waiting for your confirmation/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/confirmation link/i);
  });

  it("shows the server's message when the confirmation email cannot be sent", async () => {
    vi.spyOn(emailApi, "fetchEmailPreferences").mockResolvedValue(preferences("not_subscribed"));
    vi.spyOn(emailApi, "subscribeToNewsletter").mockRejectedValue(
      new ApiError("We could not send the confirmation email right now.", 503),
    );
    const user = userEvent.setup();
    renderWithProviders(<EmailPreferencesSection />);

    await user.click(await screen.findByRole("checkbox", { name: /receive the newsletter/i }));
    await user.click(screen.getByRole("button", { name: "Subscribe" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not send/i);
  });

  it("lets a pending request be resent or cancelled", async () => {
    vi.spyOn(emailApi, "fetchEmailPreferences").mockResolvedValue(
      preferences("pending", "2026-09-26T10:00:00.000Z"),
    );
    vi.spyOn(emailApi, "unsubscribeFromNewsletter").mockResolvedValue({
      status: "not_subscribed",
      since: "2026-09-26T11:00:00.000Z",
    });
    const user = userEvent.setup();
    renderWithProviders(<EmailPreferencesSection />);

    expect(
      await screen.findByRole("button", { name: "Resend confirmation email" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel request" }));

    expect(await screen.findByText(/not subscribed/i)).toBeInTheDocument();
  });

  it("shows a subscribed state with an unsubscribe action", async () => {
    vi.spyOn(emailApi, "fetchEmailPreferences").mockResolvedValue(
      preferences("subscribed", "2026-09-26T10:00:00.000Z"),
    );
    vi.spyOn(emailApi, "unsubscribeFromNewsletter").mockResolvedValue({
      status: "not_subscribed",
      since: "2026-09-26T11:00:00.000Z",
    });
    const user = userEvent.setup();
    renderWithProviders(<EmailPreferencesSection />);

    expect(await screen.findByText(/^Subscribed/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Unsubscribe" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/unsubscribed/i);
    expect(screen.getByRole("checkbox", { name: /receive the newsletter/i })).not.toBeChecked();
  });

  it("shows an error with a retry when preferences cannot be loaded", async () => {
    const fetchSpy = vi
      .spyOn(emailApi, "fetchEmailPreferences")
      .mockRejectedValueOnce(new ApiError("Something went wrong.", 500))
      .mockResolvedValueOnce(preferences("not_subscribed"));
    const user = userEvent.setup();
    renderWithProviders(<EmailPreferencesSection />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t load/i);
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("checkbox", { name: /receive the newsletter/i })).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
