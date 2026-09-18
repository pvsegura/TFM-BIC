import { expect, test } from "@playwright/test";

test("redirects an unauthenticated user from a protected route to login", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("redirects from another protected route too, not just /dashboard", async ({ page }) => {
  await page.goto("/settings");

  await expect(page).toHaveURL(/\/login/);
});
