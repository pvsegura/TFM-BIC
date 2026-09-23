import { expect, test, type Page } from "@playwright/test";

import { registerAndVerifyUser, uniqueEmail } from "./helpers/register-and-verify.js";
import { signInViaUi } from "./helpers/ui.js";

/**
 * M10 — Phonetics, end to end against the real API (NODE_ENV=test: real server, real HTTP,
 * in-process Postgres, the real shipped `content/` tree) behind the real dev server. Each test
 * uses its own fresh user, so state never leaks between tests.
 */

const PASSWORD = "a-good-password-123";
const API = "http://localhost:3000";

async function arrangeSignedIn(page: Page, request: Parameters<typeof registerAndVerifyUser>[0]) {
  const email = uniqueEmail("phonetics");
  await registerAndVerifyUser(request, email, PASSWORD);
  await signInViaUi(page, email, PASSWORD);
  return email;
}

/** Opens Phonetics the way a student does: the nav link, then Polish. */
async function openPolishPhonetics(page: Page) {
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Phonetics" })
    .click();
  await expect(page).toHaveURL(/\/learn\/phonetics$/);
  await page
    .getByRole("navigation", { name: "Languages" })
    .getByRole("link", { name: /Polish/ })
    .click();
  await expect(page).toHaveURL(/\/learn\/phonetics\?language=pl$/);
  await expect(page.getByRole("list", { name: "Phonetics" })).toBeVisible();
}

test.describe("browsing phonetics", () => {
  test("login, open Phonetics: Polish sounds are listed with topics", async ({ page, request }) => {
    await arrangeSignedIn(page, request);

    await openPolishPhonetics(page);

    await expect(page.getByRole("navigation", { name: "Phonetics topics" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Consonants/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Nasal vowels/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "IPA symbol t͡ʂ" })).toBeVisible();
  });

  test("filters the list by topic", async ({ page, request }) => {
    await arrangeSignedIn(page, request);
    await openPolishPhonetics(page);

    await page.getByRole("button", { name: /Nasal vowels/ }).click();
    await expect(page).toHaveURL(/topic=vowels/);

    await expect(page.getByRole("link", { name: "IPA symbol t͡ʂ" })).not.toBeVisible();
    await expect(page.getByRole("link", { name: /IPA symbol/ })).toHaveCount(2);
  });
});

test.describe("a sound's detail and progress", () => {
  test("opens a sound's detail, sees its IPA and explanation, marks it practiced, and the status survives a refresh", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openPolishPhonetics(page);

    await page.getByRole("link", { name: "IPA symbol t͡ʂ" }).first().click();
    await expect(page).toHaveURL(/\/learn\/phonetics\/pl-ipa-cz$/);
    await expect(page.getByText("t͡ʂ", { exact: true })).toBeVisible();
    await expect(page.getByText(/retroflex affricate/)).toBeVisible();

    // Opening the page recorded a view; the student now practices it explicitly.
    await page.getByRole("button", { name: "Practice" }).click();
    await expect(page.getByText("Practiced", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByText("Practiced", { exact: true })).toBeVisible();
  });

  test("marks a practiced sound as completed", async ({ page, request }) => {
    await arrangeSignedIn(page, request);
    await page.goto("/learn/phonetics/pl-ipa-cz");
    await page.getByRole("button", { name: "Practice" }).click();
    await expect(page.getByText("Practiced", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Mark as completed" }).click();

    // The completed badge combines a checkmark and the word "Completed" in one element (like
    // Vocabulary's "Learned" badge), so it is found by its status attribute rather than exact text.
    await expect(page.locator('[data-status="completed"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Practice" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Mark as completed" })).not.toBeVisible();
  });
});

test.describe("integration with vocabulary", () => {
  test("accesses phonetics from a vocabulary word's pronunciation guide link", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await page.goto("/learn/vocabulary/pl-dom");
    await expect(page.getByRole("heading", { level: 1, name: "dom" })).toBeVisible();

    await page.getByRole("link", { name: "View pronunciation guide" }).click();

    await expect(page).toHaveURL(/\/learn\/phonetics\?language=pl$/);
    await expect(page.getByRole("list", { name: "Phonetics" })).toBeVisible();
  });
});

test.describe("security — one student cannot see or change another student's phonetics progress", () => {
  test("a practiced sound is invisible to another student, and progress cannot be forged through the API", async ({
    page,
    request,
    browser,
  }) => {
    await arrangeSignedIn(page, request);
    await page.goto("/learn/phonetics/pl-ipa-cz");
    await page.getByRole("button", { name: "Practice" }).click();
    await expect(page.getByText("Practiced", { exact: true })).toBeVisible();

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await arrangeSignedIn(otherPage, otherContext.request);
    await otherPage.goto("/learn/phonetics/pl-ipa-cz");
    await expect(otherPage.getByText("Not started", { exact: true })).toBeVisible();

    // The other student cannot name someone else, or send extra fields the action does not
    // document: the body is refused.
    const forged = await otherContext.request.post(`${API}/phonetics/pl-ipa-cz/practice`, {
      data: { userId: "someone-else" },
    });
    expect(forged.status()).toBe(400);

    await otherContext.close();
  });
});
