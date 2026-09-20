import { AVATAR_CATALOG, type ProfileResponse } from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProtectedRoute } from "../components/protected-route.js";
import { ApiError } from "../services/api-error.js";
import * as authApi from "../services/auth-api.js";
import * as profileApi from "../services/profile-api.js";
import { ProfilePage } from "./profile-page.js";

const SAVED: ProfileResponse = {
  userId: "user-1",
  firstName: "Ana",
  lastName: "García",
  nickname: "anita",
  avatarId: "avatar-02",
  email: "ana@example.com",
  role: "STUDENT",
};

const UNSET: ProfileResponse = {
  ...SAVED,
  firstName: null,
  lastName: null,
  nickname: null,
  avatarId: null,
};

function renderPage() {
  const Stub = createRoutesStub([
    {
      Component: ProtectedRoute,
      children: [{ path: "/profile", Component: ProfilePage }],
    },
    { path: "/login", Component: () => <p>Login page</p> },
  ]);
  vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue({
    id: "user-1",
    email: "ana@example.com",
    role: "STUDENT",
    emailVerified: true,
  });
  return renderWithProviders(<Stub initialEntries={["/profile"]} />);
}

async function renderLoaded(profile: ProfileResponse = SAVED) {
  vi.spyOn(profileApi, "fetchCurrentProfile").mockResolvedValue(profile);
  renderPage();
  await screen.findByLabelText("First name");
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ProfilePage — loading and load failure", () => {
  it("shows a loading status while the profile is being fetched", async () => {
    vi.spyOn(profileApi, "fetchCurrentProfile").mockReturnValue(new Promise(() => undefined));
    renderPage();

    // (ProtectedRoute shows its own "Loading…" status while the user is
    // restored, so target this page's own message.)
    expect(await screen.findByText(/loading your profile/i)).toHaveAttribute("role", "status");
    expect(screen.getByRole("heading", { level: 1, name: "Your profile" })).toBeInTheDocument();
    expect(screen.queryByLabelText("First name")).not.toBeInTheDocument();
  });

  it("shows an error with a retry button when the profile cannot be loaded, and recovers", async () => {
    const fetchSpy = vi
      .spyOn(profileApi, "fetchCurrentProfile")
      .mockRejectedValueOnce(new ApiError("Internal Server Error", 500))
      .mockResolvedValue(SAVED);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t load your profile/i);
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByLabelText("First name")).toHaveValue("Ana");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("sends the user to the login page when the session has ended", async () => {
    vi.spyOn(profileApi, "fetchCurrentProfile").mockRejectedValue(
      new ApiError("Unauthenticated", 401),
    );
    renderPage();

    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });
});

describe("ProfilePage — viewing", () => {
  it("has a level-one heading and named sections", async () => {
    await renderLoaded();

    expect(screen.getByRole("heading", { level: 1, name: "Your profile" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Account" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Personal details" })).toBeInTheDocument();
  });

  it("shows the saved values in labelled inputs", async () => {
    await renderLoaded();

    expect(screen.getByLabelText("First name")).toHaveValue("Ana");
    expect(screen.getByLabelText("Last name")).toHaveValue("García");
    expect(screen.getByLabelText("Nickname")).toHaveValue("anita");
    expect(screen.getByRole("radio", { name: "Owl" })).toBeChecked();
  });

  it("shows blank inputs and no avatar selected for a profile that was never saved", async () => {
    await renderLoaded(UNSET);

    expect(screen.getByLabelText("First name")).toHaveValue("");
    expect(screen.getByLabelText("Last name")).toHaveValue("");
    expect(screen.getByLabelText("Nickname")).toHaveValue("");
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).not.toBeChecked();
    }
  });

  it("shows the account email and role as read-only facts, not inputs", async () => {
    await renderLoaded();

    const account = screen.getByRole("region", { name: "Account" });
    expect(within(account).getByText("ana@example.com")).toBeInTheDocument();
    expect(within(account).getByText("Student")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Role")).not.toBeInTheDocument();
    expect(account).toHaveTextContent(/can.t be changed here/i);
  });

  it("offers every avatar in the shared catalog", async () => {
    await renderLoaded();

    const group = screen.getByRole("group", { name: "Choose your avatar" });
    expect(within(group).getAllByRole("radio")).toHaveLength(AVATAR_CATALOG.length);
    for (const avatar of AVATAR_CATALOG) {
      expect(within(group).getByRole("radio", { name: avatar.label })).toBeInTheDocument();
    }
  });

  it("gives the fields sensible autocomplete hints", async () => {
    await renderLoaded();

    expect(screen.getByLabelText("First name")).toHaveAttribute("autocomplete", "given-name");
    expect(screen.getByLabelText("Last name")).toHaveAttribute("autocomplete", "family-name");
    expect(screen.getByLabelText("Nickname")).toHaveAttribute("autocomplete", "nickname");
  });

  it("renders user-entered values as text, never as HTML", async () => {
    await renderLoaded({ ...SAVED, firstName: "<img src=x onerror=alert(1)>" });

    expect(screen.getByLabelText("First name")).toHaveValue("<img src=x onerror=alert(1)>");
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("ProfilePage — editing and saving", () => {
  it("keeps Save disabled until something changes", async () => {
    const user = userEvent.setup();
    await renderLoaded();

    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    await user.type(screen.getByLabelText("First name"), "a");

    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });

  it("saves every edited field and shows the profile the server persisted", async () => {
    const saveSpy = vi.spyOn(profileApi, "updateProfile").mockResolvedValue({
      ...SAVED,
      firstName: "Anna Maria",
      lastName: "Serrano",
      nickname: "ani",
      avatarId: "avatar-04",
    });
    const user = userEvent.setup();
    await renderLoaded();

    await user.clear(screen.getByLabelText("First name"));
    await user.type(screen.getByLabelText("First name"), "  Anna  ");
    await user.clear(screen.getByLabelText("Last name"));
    await user.type(screen.getByLabelText("Last name"), "Serrano");
    await user.clear(screen.getByLabelText("Nickname"));
    await user.type(screen.getByLabelText("Nickname"), "ani");
    await user.click(screen.getByRole("radio", { name: "Otter" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/profile saved/i);
    expect(saveSpy.mock.calls[0]?.[0]).toEqual({
      firstName: "Anna",
      lastName: "Serrano",
      nickname: "ani",
      avatarId: "avatar-04",
    });
    // The form now shows what the server returned, not what was typed.
    expect(screen.getByLabelText("First name")).toHaveValue("Anna Maria");
    expect(screen.getByRole("radio", { name: "Otter" })).toBeChecked();
  });

  it("disables Save again once saved, since nothing is left to save", async () => {
    vi.spyOn(profileApi, "updateProfile").mockResolvedValue({ ...SAVED, nickname: "ani" });
    const user = userEvent.setup();
    await renderLoaded();

    await user.clear(screen.getByLabelText("Nickname"));
    await user.type(screen.getByLabelText("Nickname"), "ani");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await screen.findByText(/profile saved/i);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("marks the success message with a check mark, not colour alone", async () => {
    vi.spyOn(profileApi, "updateProfile").mockResolvedValue({ ...SAVED, nickname: "ani" });
    const user = userEvent.setup();
    await renderLoaded();

    await user.clear(screen.getByLabelText("Nickname"));
    await user.type(screen.getByLabelText("Nickname"), "ani");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("status")).toHaveTextContent("✓");
  });

  it("clears the success message as soon as the user edits again", async () => {
    vi.spyOn(profileApi, "updateProfile").mockResolvedValue({ ...SAVED, nickname: "ani" });
    const user = userEvent.setup();
    await renderLoaded();
    await user.clear(screen.getByLabelText("Nickname"));
    await user.type(screen.getByLabelText("Nickname"), "ani");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText(/profile saved/i);

    await user.type(screen.getByLabelText("Nickname"), "x");

    expect(screen.queryByText(/profile saved/i)).not.toBeInTheDocument();
  });

  it("sends null for a field the user blanked, so it is cleared", async () => {
    const saveSpy = vi
      .spyOn(profileApi, "updateProfile")
      .mockResolvedValue({ ...SAVED, nickname: null });
    const user = userEvent.setup();
    await renderLoaded();

    await user.clear(screen.getByLabelText("Nickname"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await screen.findByText(/profile saved/i);
    expect(saveSpy.mock.calls[0]?.[0]).toMatchObject({ nickname: null });
    expect(screen.getByLabelText("Nickname")).toHaveValue("");
  });

  it("treats a whitespace-only input as blank", async () => {
    const saveSpy = vi
      .spyOn(profileApi, "updateProfile")
      .mockResolvedValue({ ...SAVED, lastName: null });
    const user = userEvent.setup();
    await renderLoaded();

    await user.clear(screen.getByLabelText("Last name"));
    await user.type(screen.getByLabelText("Last name"), "    ");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await screen.findByText(/profile saved/i);
    expect(saveSpy.mock.calls[0]?.[0]).toMatchObject({ lastName: null });
  });

  it("does not send an avatar when none has ever been chosen", async () => {
    const saveSpy = vi
      .spyOn(profileApi, "updateProfile")
      .mockResolvedValue({ ...UNSET, firstName: "Ana" });
    const user = userEvent.setup();
    await renderLoaded(UNSET);

    await user.type(screen.getByLabelText("First name"), "Ana");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await screen.findByText(/profile saved/i);
    expect(saveSpy.mock.calls[0]?.[0]).not.toHaveProperty("avatarId");
  });

  it("preserves Unicode names as typed", async () => {
    const saveSpy = vi.spyOn(profileApi, "updateProfile").mockResolvedValue(SAVED);
    const user = userEvent.setup();
    await renderLoaded(UNSET);

    await user.type(screen.getByLabelText("First name"), "Łukasz");
    await user.type(screen.getByLabelText("Last name"), "Dvořák");
    await user.type(screen.getByLabelText("Nickname"), "李小龙");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await screen.findByText(/profile saved/i);
    expect(saveSpy.mock.calls[0]?.[0]).toMatchObject({
      firstName: "Łukasz",
      lastName: "Dvořák",
      nickname: "李小龙",
    });
  });
});

describe("ProfilePage — submitting state", () => {
  it("disables Save and shows progress while saving, and submits only once on a double click", async () => {
    const pending = deferred<ProfileResponse>();
    const saveSpy = vi.spyOn(profileApi, "updateProfile").mockReturnValue(pending.promise);
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(screen.getByLabelText("First name"), "x");
    const save = screen.getByRole("button", { name: "Save changes" });
    await user.dblClick(save);

    const saving = await screen.findByRole("button", { name: "Saving…" });
    expect(saving).toBeDisabled();
    expect(saveSpy).toHaveBeenCalledTimes(1);

    pending.resolve({ ...SAVED, firstName: "Anax" });
    expect(await screen.findByText(/profile saved/i)).toBeInTheDocument();
  });
});

describe("ProfilePage — validation", () => {
  it("shows a nickname error and does not submit", async () => {
    const saveSpy = vi.spyOn(profileApi, "updateProfile");
    const user = userEvent.setup();
    await renderLoaded();

    await user.clear(screen.getByLabelText("Nickname"));
    await user.type(screen.getByLabelText("Nickname"), "x");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    const nickname = screen.getByLabelText("Nickname");
    await vi.waitFor(() => {
      expect(nickname).toHaveAttribute("aria-invalid", "true");
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(/2–30 characters/);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("rejects an extremely long name without submitting", async () => {
    const saveSpy = vi.spyOn(profileApi, "updateProfile");
    const user = userEvent.setup();
    await renderLoaded();

    await user.clear(screen.getByLabelText("First name"));
    await user.click(screen.getByLabelText("First name"));
    await user.paste("a".repeat(5000));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/1–100 characters/);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("rejects a control character in a name", async () => {
    const saveSpy = vi.spyOn(profileApi, "updateProfile");
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(screen.getByLabelText("Last name"));
    await user.paste("Gar\u0001cía");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/control characters/);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("keeps what the user typed after a validation error", async () => {
    const user = userEvent.setup();
    await renderLoaded();

    await user.clear(screen.getByLabelText("Nickname"));
    await user.type(screen.getByLabelText("Nickname"), "x");
    await user.type(screen.getByLabelText("First name"), "bert");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("alert");

    expect(screen.getByLabelText("Nickname")).toHaveValue("x");
    expect(screen.getByLabelText("First name")).toHaveValue("Anabert");
  });
});

describe("ProfilePage — save failures", () => {
  it("maps the server's field errors onto the inputs and keeps the entered data", async () => {
    vi.spyOn(profileApi, "updateProfile").mockRejectedValue(
      new ApiError("Invalid request body.", 400, { nickname: "Enter 2–30 characters." }),
    );
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(screen.getByLabelText("Nickname"), "z");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Enter 2–30 characters.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nickname")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Nickname")).toHaveValue("anitaz");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });

  it("shows the server's safe message for a failure with no field detail, and allows a retry", async () => {
    const saveSpy = vi
      .spyOn(profileApi, "updateProfile")
      .mockRejectedValueOnce(new ApiError("Internal Server Error", 500))
      .mockResolvedValue({ ...SAVED, firstName: "Anax" });
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(screen.getByLabelText("First name"), "x");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Internal Server Error");
    expect(screen.getByLabelText("First name")).toHaveValue("Anax");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText(/profile saved/i)).toBeInTheDocument();
    expect(screen.queryByText("Internal Server Error")).not.toBeInTheDocument();
    expect(saveSpy).toHaveBeenCalledTimes(2);
  });

  it("explains a network failure in plain words without losing the entered data", async () => {
    vi.spyOn(profileApi, "updateProfile").mockRejectedValue(new TypeError("Failed to fetch"));
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(screen.getByLabelText("First name"), "x");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t reach the server/i);
    expect(screen.getByLabelText("First name")).toHaveValue("Anax");
  });

  it("never shows raw error internals", async () => {
    vi.spyOn(profileApi, "updateProfile").mockRejectedValue(
      new Error("connect ECONNREFUSED 10.0.0.5:5432 at Pool.query (pg/lib/pool.js:1:1)"),
    );
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(screen.getByLabelText("First name"), "x");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent(/ECONNREFUSED|pg\/lib|Pool/);
  });

  it("sends the user to the login page if the session ended while editing", async () => {
    vi.spyOn(profileApi, "updateProfile").mockRejectedValue(new ApiError("Unauthenticated", 401));
    const user = userEvent.setup();
    await renderLoaded();

    await user.type(screen.getByLabelText("First name"), "x");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });
});

describe("ProfilePage — accessibility", () => {
  it("reserves a polite live region for save status before anything is saved", async () => {
    await renderLoaded();

    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(status).toBeEmptyDOMElement();
  });

  it("labels every field and the avatar group", async () => {
    await renderLoaded();

    expect(screen.getByLabelText("First name")).toBeInTheDocument();
    expect(screen.getByLabelText("Last name")).toBeInTheDocument();
    expect(screen.getByLabelText("Nickname")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Choose your avatar" })).toBeInTheDocument();
  });

  it("can be completed with the keyboard alone", async () => {
    const saveSpy = vi.spyOn(profileApi, "updateProfile").mockResolvedValue(SAVED);
    const user = userEvent.setup();
    await renderLoaded(UNSET);

    await user.tab();
    expect(screen.getByLabelText("First name")).toHaveFocus();
    await user.keyboard("Ana");
    await user.tab();
    expect(screen.getByLabelText("Last name")).toHaveFocus();
    await user.keyboard("García");
    await user.tab();
    expect(screen.getByLabelText("Nickname")).toHaveFocus();
    await user.keyboard("anita");
    await user.tab();
    await user.keyboard("{ArrowRight}");
    await user.tab();
    expect(screen.getByRole("button", { name: "Save changes" })).toHaveFocus();
    await user.keyboard("{Enter}");

    await vi.waitFor(() => {
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });
  });
});
