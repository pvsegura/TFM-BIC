import { expect, type Page } from "@playwright/test";

/** Logs in through the real login form and waits for the post-login page.
 * Login returns to the page the user was originally sent away from (see
 * pages/login-page.tsx), so after a logout on `/profile` that is `/profile`,
 * otherwise the dashboard. */
export async function signInViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/(dashboard|profile)$/);
}

/** Opens the profile page the way a user does — through the nav link — and
 * waits until the form has loaded. */
export async function openProfileViaNav(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Profile" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole("heading", { level: 1, name: "Your profile" })).toBeVisible();
  await expect(page.getByLabel("First name")).toBeVisible();
}
