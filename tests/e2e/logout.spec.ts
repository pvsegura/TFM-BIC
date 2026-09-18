import { expect, test } from "@playwright/test";

import { registerAndVerifyUser, uniqueEmail } from "./helpers/register-and-verify.js";

test("logs out and the dashboard becomes inaccessible again", async ({ page, request }) => {
  const email = uniqueEmail();
  const password = "a-good-password-123";
  await registerAndVerifyUser(request, email, password);

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
