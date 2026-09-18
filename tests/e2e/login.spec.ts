import { expect, test } from "@playwright/test";

import { registerAndVerifyUser, uniqueEmail } from "./helpers/register-and-verify.js";

test("logs in with valid credentials and reaches the dashboard", async ({ page, request }) => {
  const email = uniqueEmail();
  const password = "a-good-password-123";
  await registerAndVerifyUser(request, email, password);

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(email)).toBeVisible();
});

test("shows a safe, generic error and no authenticated state for a wrong password", async ({
  page,
  request,
}) => {
  const email = uniqueEmail();
  const password = "a-good-password-123";
  await registerAndVerifyUser(request, email, password);

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByRole("alert")).toHaveText(/invalid email or password/i);
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: "Log out" })).toHaveCount(0);
  await expect(page.getByText(email)).toHaveCount(0);
});

test("shows the identical generic error for a nonexistent account (no account enumeration)", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(uniqueEmail("nobody"));
  await page.getByLabel("Password").fill("whatever-password");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByRole("alert")).toHaveText(/invalid email or password/i);
});
