import { expect, test } from "@playwright/test";

import { getLinkToken, registerAndVerifyUser, uniqueEmail } from "./helpers/register-and-verify.js";

test("requests a reset, resets the password via the test email link, and logs in with the new password", async ({
  page,
  request,
}) => {
  const email = uniqueEmail();
  const oldPassword = "a-good-password-123";
  const newPassword = "a-new-good-password-456";
  await registerAndVerifyUser(request, email, oldPassword);

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  const token = await getLinkToken(request, email);
  await page.goto(`/reset-password?token=${token}`);
  await page.getByLabel(/new password/i).fill(newPassword);
  await page.getByRole("button", { name: "Reset password" }).click();
  await expect(page.getByText("Password updated. Please log in again.")).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(newPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("the old password no longer works after a reset", async ({ page, request }) => {
  const email = uniqueEmail();
  const oldPassword = "a-good-password-123";
  const newPassword = "a-new-good-password-456";
  await registerAndVerifyUser(request, email, oldPassword);

  await page.request.post("http://localhost:3000/auth/password-reset/request", {
    data: { email },
  });
  const token = await getLinkToken(request, email);
  await page.request.post("http://localhost:3000/auth/password-reset/confirm", {
    data: { token, newPassword },
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(oldPassword);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByRole("alert")).toHaveText(/invalid email or password/i);
});
