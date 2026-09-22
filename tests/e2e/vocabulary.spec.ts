import { expect, test, type Page } from "@playwright/test";

import { registerAndVerifyUser, uniqueEmail } from "./helpers/register-and-verify.js";
import { signInViaUi } from "./helpers/ui.js";

/**
 * M9 — Vocabulary, end to end against the real API (NODE_ENV=test: real server, real HTTP,
 * in-process Postgres, the real shipped `content/` tree) behind the real dev server. Each test
 * uses its own fresh user, so state never leaks between tests.
 */

const PASSWORD = "a-good-password-123";
const API = "http://localhost:3000";

async function arrangeSignedIn(page: Page, request: Parameters<typeof registerAndVerifyUser>[0]) {
  const email = uniqueEmail("vocabulary");
  await registerAndVerifyUser(request, email, PASSWORD);
  await signInViaUi(page, email, PASSWORD);
  return email;
}

/** Opens Vocabulary the way a student does: the nav link, then Polish. */
async function openPolishVocabulary(page: Page) {
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Vocabulary" })
    .click();
  await expect(page).toHaveURL(/\/learn\/vocabulary$/);
  await page
    .getByRole("navigation", { name: "Languages" })
    .getByRole("link", { name: /Polish/ })
    .click();
  await expect(page).toHaveURL(/\/learn\/vocabulary\?language=pl$/);
  await expect(page.getByRole("list", { name: "Vocabulary" })).toBeVisible();
}

function wordCard(page: Page, lemma: string) {
  return page
    .getByRole("list", { name: /vocabulary/i })
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: lemma, exact: true }) });
}

/** Vocabulary is a handful of categories worth of words (more than fit on one page), so a specific
 * word is found the way a student would: search for it, then open it. */
async function openWord(page: Page, lemma: string) {
  await page.getByRole("searchbox", { name: "Search" }).fill(lemma);
  await page.getByRole("link", { name: lemma, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: lemma })).toBeVisible();
}

test.describe("browsing vocabulary", () => {
  test("login, open Vocabulary: Polish words are listed with categories", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);

    await openPolishVocabulary(page);

    await expect(page.getByRole("navigation", { name: "Vocabulary categories" })).toBeVisible();
    await expect(
      page.getByRole("list", { name: /vocabulary/i }).getByRole("listitem"),
    ).not.toHaveCount(0);
  });

  test("searching filters the list to matching words, with an unsaved status", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openPolishVocabulary(page);

    await page.getByRole("searchbox", { name: "Search" }).fill("dom");

    await expect(wordCard(page, "dom")).toBeVisible();
    await expect(wordCard(page, "dom")).toContainText("Not saved");
    await expect(page.getByRole("list", { name: /vocabulary/i }).getByRole("listitem")).toHaveCount(
      1,
    );
  });
});

test.describe("saving and learning a word", () => {
  test("opens a word's detail, saves it, sees it in My Vocabulary, marks it learned, and the status survives a refresh", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openPolishVocabulary(page);
    await openWord(page, "dom");
    await expect(page).toHaveURL(/\/learn\/vocabulary\/pl-dom$/);

    await page.getByRole("button", { name: "Save word" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    await page.goto("/learn/vocabulary/mine?language=pl");
    await expect(wordCard(page, "dom")).toBeVisible();

    await page.getByRole("link", { name: "dom", exact: true }).click();
    await page.getByRole("button", { name: "Mark as learned" }).click();
    await expect(page.locator('[data-status="learned"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark as learned" })).toHaveCount(0);

    await page.reload();

    await expect(page.locator('[data-status="learned"]')).toBeVisible();
  });

  test("removing a saved word takes it off My Vocabulary", async ({ page, request }) => {
    await arrangeSignedIn(page, request);
    await openPolishVocabulary(page);
    await openWord(page, "dom");
    await page.getByRole("button", { name: "Save word" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Remove from list" }).click();

    await expect(page.getByRole("button", { name: "Save word" })).toBeVisible();
    await page.goto("/learn/vocabulary/mine?language=pl");
    await expect(page.getByText("No vocabulary saved yet.")).toBeVisible();
  });
});

test.describe("security — one student cannot see or change another student's vocabulary", () => {
  test("another student's saved word is invisible, and a status change cannot be forged through the API", async ({
    page,
    request,
    browser,
  }) => {
    await arrangeSignedIn(page, request);
    await page.goto("/learn/vocabulary/pl-dom");
    await page.getByRole("button", { name: "Save word" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await arrangeSignedIn(otherPage, otherContext.request);
    await otherPage.goto("/learn/vocabulary/mine?language=pl");
    await expect(otherPage.getByText("No vocabulary saved yet.")).toBeVisible();

    await otherPage.goto("/learn/vocabulary/pl-dom");
    await expect(otherPage.getByText("Not saved", { exact: true })).toBeVisible();

    // The other student cannot name someone else, or set a status directly with an extra field:
    // the body is refused.
    const forged = await otherContext.request.put(`${API}/vocabulary/pl-dom/status`, {
      data: { status: "learned", userId: "someone-else" },
    });
    expect(forged.status()).toBe(400);

    await otherContext.close();
  });
});
