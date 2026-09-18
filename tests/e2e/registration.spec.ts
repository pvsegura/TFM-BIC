import { expect, test } from "@playwright/test";

import { getLinkToken, uniqueEmail } from "./helpers/register-and-verify.js";

test("register, verify email via the test email adapter, then log in", async ({
  page,
  request,
}) => {
  const email = uniqueEmail();
  const password = "a-good-password-123";

  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  const token = await getLinkToken(request, email);
  await page.goto(`/verify-email?token=${token}`);
  await expect(page.getByText("Email verified.")).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(email)).toBeVisible();
});

test("registering the same email twice returns the identical safe response (no account enumeration)", async ({
  page,
}) => {
  const email = uniqueEmail();
  const password = "a-good-password-123";

  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  const firstMessage = await page
    .locator("p")
    .filter({ hasText: /verification/i })
    .textContent();

  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a-different-password-789");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  const secondMessage = await page
    .locator("p")
    .filter({ hasText: /verification/i })
    .textContent();

  expect(secondMessage).toBe(firstMessage);
});
