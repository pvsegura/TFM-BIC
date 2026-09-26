import { renderWithProviders } from "@tfm-bic/testing";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as download from "../services/browser-download.js";
import * as dataApi from "../services/data-management-api.js";
import { DataManagementSection } from "./data-management-section.js";

function renderSection() {
  const Stub = createRoutesStub([
    { path: "/profile", Component: DataManagementSection },
    { path: "/account-deleted", Component: () => <p>Account deleted page</p> },
  ]);
  return renderWithProviders(<Stub initialEntries={["/profile"]} />);
}

afterEach(() => {
  vi.restoreAllMocks();
});

async function openDeletion(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Delete my account…" }));
}

describe("DataManagementSection — export", () => {
  it("downloads the export under the server's file name and says so", async () => {
    vi.spyOn(dataApi, "fetchPersonalDataExport").mockResolvedValue({
      fileName: "tfm-bic-personal-data-2026-09-26.json",
      content: "{}",
    });
    const save = vi.spyOn(download, "saveTextFile").mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: "Download my data" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      /downloaded as tfm-bic-personal-data-2026-09-26\.json/i,
    );
    expect(save).toHaveBeenCalledWith(
      "tfm-bic-personal-data-2026-09-26.json",
      "{}",
      "application/json",
    );
  });

  it("explains what the export contains and what it leaves out", () => {
    renderSection();

    expect(screen.getByRole("heading", { name: "Your data" })).toBeInTheDocument();
    expect(screen.getByText(/machine-readable JSON file/i)).toBeInTheDocument();
    expect(screen.getByText(/never includes your password/i)).toBeInTheDocument();
  });

  it("keeps one request in flight and shows progress", async () => {
    let resolve: (value: { fileName: string; content: string }) => void = () => undefined;
    const fetchExport = vi.spyOn(dataApi, "fetchPersonalDataExport").mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    vi.spyOn(download, "saveTextFile").mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: "Download my data" }));

    const busy = screen.getByRole("button", { name: "Preparing your download…" });
    expect(busy).toBeDisabled();
    await user.click(busy);
    expect(fetchExport).toHaveBeenCalledTimes(1);
    resolve({ fileName: "f.json", content: "{}" });
    expect(await screen.findByRole("button", { name: "Download my data" })).toBeEnabled();
  });

  it("shows the API's message when the export fails", async () => {
    vi.spyOn(dataApi, "fetchPersonalDataExport").mockRejectedValue(
      new ApiError("Rate limit exceeded, retry in 1 hour", 429),
    );
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: "Download my data" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/rate limit exceeded/i);
  });
});

describe("DataManagementSection — account deletion", () => {
  it("starts closed; opening explains the consequences and moves focus to the dialog heading", async () => {
    const user = userEvent.setup();
    renderSection();
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();

    await openDeletion(user);

    const heading = screen.getByRole("heading", { name: "Delete your account?" });
    expect(heading).toHaveFocus();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    expect(screen.getByText(/only want to stop the newsletter/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("checkbox", { name: /permanently deleted/i })).not.toBeChecked();
  });

  it("requires the acknowledgement and the password before calling the API", async () => {
    const remove = vi.spyOn(dataApi, "deleteAccount");
    const user = userEvent.setup();
    renderSection();
    await openDeletion(user);

    await user.click(screen.getByRole("button", { name: "Delete my account permanently" }));

    expect(screen.getByText(/enter your current password/i)).toBeInTheDocument();
    expect(screen.getByText(/tick the box to confirm/i)).toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();
  });

  it("shows the API's message for a wrong password and keeps the dialog open", async () => {
    vi.spyOn(dataApi, "deleteAccount").mockRejectedValue(
      new ApiError("The password is incorrect.", 403),
    );
    const user = userEvent.setup();
    renderSection();
    await openDeletion(user);

    await user.type(screen.getByLabelText("Current password"), "wrong");
    await user.click(screen.getByRole("checkbox", { name: /permanently deleted/i }));
    await user.click(screen.getByRole("button", { name: "Delete my account permanently" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The password is incorrect.");
    expect(screen.getByRole("heading", { name: "Delete your account?" })).toBeInTheDocument();
  });

  it("deletes with the password and goes to the confirmation page", async () => {
    const remove = vi.spyOn(dataApi, "deleteAccount").mockResolvedValue();
    const user = userEvent.setup();
    renderSection();
    await openDeletion(user);

    await user.type(screen.getByLabelText("Current password"), "right-password");
    await user.click(screen.getByRole("checkbox", { name: /permanently deleted/i }));
    await user.click(screen.getByRole("button", { name: "Delete my account permanently" }));

    expect(await screen.findByText("Account deleted page")).toBeInTheDocument();
    expect(remove).toHaveBeenCalledWith("right-password");
  });

  it("cancel closes the dialog, forgets the password and returns focus", async () => {
    const user = userEvent.setup();
    renderSection();
    await openDeletion(user);
    await user.type(screen.getByLabelText("Current password"), "typed");

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
    const opener = screen.getByRole("button", { name: "Delete my account…" });
    await waitFor(() => {
      expect(opener).toHaveFocus();
    });
    await openDeletion(user);
    expect(screen.getByLabelText("Current password")).toHaveValue("");
  });
});
