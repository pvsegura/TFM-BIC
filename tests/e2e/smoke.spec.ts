import { expect, test } from "@playwright/test";

test("home page loads and exposes the primary navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/TFM-BIC/);
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
});

test("dark mode toggle switches the color scheme", async ({ page }) => {
  await page.goto("/");

  const html = page.locator("html");
  await expect(html).not.toHaveClass(/dark/);

  await page.getByRole("button", { name: "Toggle dark mode" }).click();

  await expect(html).toHaveClass(/dark/);
});
