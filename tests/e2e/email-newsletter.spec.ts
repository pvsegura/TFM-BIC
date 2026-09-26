import { expect, test, type Page } from "@playwright/test";

import {
  appPathOf,
  getCapturedEmail,
  registerAndVerifyUser,
  uniqueEmail,
} from "./helpers/register-and-verify.js";
import { signInViaUi } from "./helpers/ui.js";

/**
 * M14 — email and newsletter, end to end, against the fake email provider only (nothing is ever
 * sent). Links are read from the NODE_ENV=test inbox route, then opened like a user would.
 */

const API_BASE = "http://localhost:3000";
const PASSWORD = "a-good-password-123";

async function openEmailPreferences(page: Page): Promise<void> {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Email preferences" })).toBeVisible();
}

async function subscribeAndConfirm(page: Page, email: string): Promise<void> {
  await openEmailPreferences(page);
  await page.getByRole("checkbox", { name: /receive the newsletter/i }).check();
  await page.getByRole("button", { name: "Subscribe" }).click();
  await expect(page.getByText(/waiting for your confirmation/i)).toBeVisible();

  const confirmation = await getCapturedEmail(page.request, email, "newsletter-confirmation");
  expect(confirmation.category).toBe("transactional");
  await page.goto(appPathOf(confirmation.links[0]!));
  await page.getByRole("button", { name: "Confirm subscription" }).click();
  await expect(page.getByRole("status")).toHaveText(/subscription is confirmed/i);
}

test("registration sends a transactional verification email whose link verifies the account", async ({
  page,
}) => {
  const email = uniqueEmail("m14-register");
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  const verification = await getCapturedEmail(page.request, email, "email-verification");
  expect(verification.category).toBe("transactional");
  expect(verification.listUnsubscribeUrl).toBeNull();
  await page.goto(appPathOf(verification.links[0]!));

  await expect(page.getByText("Email verified.")).toBeVisible();
});

test("forgot password sends a transactional reset email and never a newsletter", async ({
  page,
  request,
}) => {
  const email = uniqueEmail("m14-reset");
  await registerAndVerifyUser(request, email, PASSWORD);

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  const reset = await getCapturedEmail(request, email, "password-reset");
  expect(reset.category).toBe("transactional");
  expect(appPathOf(reset.links[0]!)).toMatch(/^\/reset-password\?token=/);
});

test("a new account is not subscribed; subscribing needs explicit consent and email confirmation", async ({
  page,
  request,
}) => {
  const email = uniqueEmail("m14-subscribe");
  await registerAndVerifyUser(request, email, PASSWORD);
  await signInViaUi(page, email, PASSWORD);
  await openEmailPreferences(page);

  await expect(page.getByText("Not subscribed.")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /receive the newsletter/i })).not.toBeChecked();
  await page.getByRole("button", { name: "Subscribe" }).click();
  await expect(page.getByRole("alert")).toHaveText(/tick the box/i);

  await subscribeAndConfirm(page, email);

  await openEmailPreferences(page);
  await expect(page.getByText(/^Subscribed since/)).toBeVisible();
});

test("the unsubscribe link in a newsletter works without logging in, and one-click is accepted", async ({
  page,
  browser,
}) => {
  const email = uniqueEmail("m14-unsubscribe");
  await registerAndVerifyUser(page.request, email, PASSWORD);
  await signInViaUi(page, email, PASSWORD);
  await subscribeAndConfirm(page, email);

  const sent = await page.request.post(`${API_BASE}/email-preferences/_test/newsletter-issues`, {
    data: { subject: "E2E news", title: "What is new", paragraphs: ["Hello from E2E."] },
  });
  expect(sent.ok()).toBe(true);
  const issue = await getCapturedEmail(page.request, email, "newsletter-issue");
  expect(issue.category).toBe("marketing");
  expect(issue.listUnsubscribeUrl).toMatch(/\/email-preferences\/newsletter\/unsubscribe\?token=/);
  const unsubscribeLink = issue.links.find((link) => link.includes("/newsletter/unsubscribe?"));
  expect(unsubscribeLink).toBeDefined();

  // A fresh browser context: no session cookie at all.
  const anonymous = await browser.newContext();
  const anonymousPage = await anonymous.newPage();
  await anonymousPage.goto(appPathOf(unsubscribeLink!));
  await anonymousPage.getByRole("button", { name: "Unsubscribe" }).click();
  await expect(anonymousPage.getByRole("status")).toHaveText(/you have been unsubscribed/i);

  // RFC 8058 one-click (what a mail client does): idempotent, form body, no Origin.
  const oneClick = await anonymous.request.post(
    issue.listUnsubscribeUrl!.replace(/^https?:\/\/[^/]+/, API_BASE),
    {
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: "List-Unsubscribe=One-Click",
    },
  );
  expect(oneClick.status()).toBe(200);
  await anonymous.close();

  await openEmailPreferences(page);
  await expect(page.getByText("Not subscribed.")).toBeVisible();
});

test("a subscriber can unsubscribe from settings, while essential email stays on", async ({
  page,
  request,
}) => {
  const email = uniqueEmail("m14-settings");
  await registerAndVerifyUser(request, email, PASSWORD);
  await signInViaUi(page, email, PASSWORD);
  await subscribeAndConfirm(page, email);
  await openEmailPreferences(page);

  await page.getByRole("button", { name: "Unsubscribe" }).click();

  const newsletter = page.getByRole("group", { name: "Newsletter" });
  await expect(newsletter.getByRole("status")).toHaveText(/unsubscribed from the newsletter/i);
  await expect(page.getByText("Not subscribed.")).toBeVisible();
  await expect(page.getByRole("group", { name: "Essential emails" })).toContainText(/always on/i);
});
