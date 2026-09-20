import { expect, test, type Page } from "@playwright/test";

import { registerAndVerifyUser, uniqueEmail } from "./helpers/register-and-verify.js";
import { openProfileViaNav, signInViaUi } from "./helpers/ui.js";

const PASSWORD = "a-good-password-123";

/** A fresh verified user, signed in through the UI and sitting on the
 * profile page. */
async function arrangeSignedInOnProfile(
  page: Page,
  request: Parameters<typeof registerAndVerifyUser>[0],
) {
  const email = uniqueEmail("profile");
  await registerAndVerifyUser(request, email, PASSWORD);
  await signInViaUi(page, email, PASSWORD);
  await openProfileViaNav(page);
  return email;
}

test.describe("viewing the profile", () => {
  test("shows the account email and role, with an empty editable profile", async ({
    page,
    request,
  }) => {
    const email = await arrangeSignedInOnProfile(page, request);

    const account = page.getByRole("region", { name: "Account" });
    await expect(account.getByText(email)).toBeVisible();
    await expect(account.getByText("Student", { exact: true })).toBeVisible();
    await expect(page.getByLabel("First name")).toHaveValue("");
    await expect(page.getByLabel("Last name")).toHaveValue("");
    await expect(page.getByLabel("Nickname")).toHaveValue("");
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  test("does not let the email be edited here", async ({ page, request }) => {
    await arrangeSignedInOnProfile(page, request);

    await expect(page.getByLabel("Email")).toHaveCount(0);
    await expect(page.getByText(/can.t be changed here/i)).toBeVisible();
  });
});

test.describe("editing the profile", () => {
  test("saves first name, last name, nickname and avatar, and they persist across a reload", async ({
    page,
    request,
  }) => {
    await arrangeSignedInOnProfile(page, request);

    await page.getByLabel("First name").fill("Łukasz");
    await page.getByLabel("Last name").fill("Dvořák");
    await page.getByLabel("Nickname").fill("lukas");
    await page.getByText("Otter", { exact: true }).click();
    await expect(page.getByRole("radio", { name: "Otter" })).toBeChecked();
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByRole("status")).toContainText("Profile saved.");

    await page.reload();

    await expect(page.getByLabel("First name")).toHaveValue("Łukasz");
    await expect(page.getByLabel("Last name")).toHaveValue("Dvořák");
    await expect(page.getByLabel("Nickname")).toHaveValue("lukas");
    await expect(page.getByRole("radio", { name: "Otter" })).toBeChecked();
  });

  test("lets a saved field be cleared", async ({ page, request }) => {
    await arrangeSignedInOnProfile(page, request);
    await page.getByLabel("Nickname").fill("lukas");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Profile saved.");

    await page.getByLabel("Nickname").fill("");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Profile saved.");
    await page.reload();

    await expect(page.getByLabel("Nickname")).toHaveValue("");
  });

  test("shows a validation error and does not submit invalid data", async ({ page, request }) => {
    await arrangeSignedInOnProfile(page, request);
    const patches: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "PATCH" && new URL(req.url()).pathname === "/profile") {
        patches.push(req.url());
      }
    });

    await page.getByLabel("Nickname").fill("x");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByRole("alert")).toContainText(/2–30 characters/);
    await expect(page.getByLabel("Nickname")).toHaveAttribute("aria-invalid", "true");
    expect(patches).toHaveLength(0);

    await page.reload();
    await expect(page.getByLabel("Nickname")).toHaveValue("");
  });

  test("stores markup-looking text as inert text and never runs it", async ({ page, request }) => {
    await arrangeSignedInOnProfile(page, request);
    const payload = `<img src=x onerror="window.__xss=1">`;

    await page.getByLabel("First name").fill(payload);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Profile saved.");
    await page.reload();

    await expect(page.getByLabel("First name")).toHaveValue(payload);
    await expect(page.locator("main img")).toHaveCount(0);
    // If the payload had executed, its onerror handler would have set this.
    expect(await page.evaluate("typeof window.__xss")).toBe("undefined");
  });
});

test.describe("access control", () => {
  test("sends a logged-out visitor who goes straight to /profile to the login flow", async ({
    page,
  }) => {
    await page.goto("/profile");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  });

  test("does not offer the profile link to a logged-out visitor", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Profile" })).toHaveCount(0);
  });

  test("rejects unauthenticated API access to the profile", async ({ request }) => {
    // A bare request context carries no session cookie.
    const get = await request.get("http://localhost:3000/profile");
    const patch = await request.patch("http://localhost:3000/profile", {
      data: { firstName: "Mallory" },
    });

    expect(get.status()).toBe(401);
    expect(patch.status()).toBe(401);
  });

  test("ignores an attempt to change role or identity through the profile API", async ({
    page,
    request,
  }) => {
    const email = await arrangeSignedInOnProfile(page, request);

    // `page.request` carries the browser's session cookie.
    const forged = await page.request.patch("/profile", {
      data: { role: "TEACHER", userId: "another-user", emailVerified: false },
    });
    const badAvatar = await page.request.patch("/profile", {
      data: { avatarId: "https://evil.example.com/a.png" },
    });
    const me = await page.request.get("/auth/me");

    expect(forged.status()).toBe(400);
    expect(badAvatar.status()).toBe(400);
    expect(await me.json()).toMatchObject({ email, role: "STUDENT", emailVerified: true });
  });

  test("never shows the previous user's profile to the next person on the same browser", async ({
    page,
    request,
  }) => {
    await arrangeSignedInOnProfile(page, request);
    await page.getByLabel("First name").fill("PrivateFirstName");
    await page.getByLabel("Nickname").fill("private-nick");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Profile saved.");
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();

    const other = uniqueEmail("second-user");
    await registerAndVerifyUser(request, other, PASSWORD);
    await signInViaUi(page, other, PASSWORD);
    await openProfileViaNav(page);

    await expect(page.getByLabel("First name")).toHaveValue("");
    await expect(page.getByLabel("Nickname")).toHaveValue("");
    await expect(page.getByText("PrivateFirstName")).toHaveCount(0);
  });
});

test.describe("dark mode", () => {
  test("keeps the profile page usable and correctly themed", async ({ page, request }) => {
    await arrangeSignedInOnProfile(page, request);

    await page.getByRole("button", { name: "Toggle dark mode" }).click();

    await expect(page.locator("html")).toHaveClass(/dark/);
    // Brand tokens: surface-dark background, off-white text.
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(15, 20, 30)");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("color", "rgb(248, 249, 250)");
    await expect(page.getByLabel("First name")).toHaveCSS("background-color", "rgb(15, 20, 30)");

    await page.getByLabel("Nickname").fill("night-owl");
    await page.getByText("Owl", { exact: true }).click();
    await expect(page.getByTestId("avatar-selected-indicator")).toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Profile saved.");
  });
});

test.describe("on a mobile viewport", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("supports the whole edit flow without horizontal scrolling", async ({ page, request }) => {
    await arrangeSignedInOnProfile(page, request);

    // String form: this folder's tsconfig has no DOM typings.
    const overflow = await page.evaluate(
      "document.documentElement.scrollWidth - document.documentElement.clientWidth",
    );
    expect(overflow, "page should not scroll horizontally").toBeLessThanOrEqual(0);

    await page.getByLabel("First name").fill("Ana");
    await page.getByLabel("Nickname").fill("anita");
    await page.getByText("Fox", { exact: true }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Profile saved.");

    await page.reload();
    await expect(page.getByLabel("First name")).toHaveValue("Ana");
    await expect(page.getByRole("radio", { name: "Fox" })).toBeChecked();
  });
});
