import { expect, test, type Page } from "@playwright/test";

import { registerAndVerifyUser, uniqueEmail } from "./helpers/register-and-verify.js";
import { signInViaUi } from "./helpers/ui.js";

/**
 * M6 — Lessons, end to end against the real API (NODE_ENV=test: real server,
 * real HTTP, in-process Postgres, the real shipped `content/` tree) behind the
 * real dev server. Each test uses its own fresh user, so progress never leaks
 * between tests.
 */

const PASSWORD = "a-good-password-123";
const API = "http://localhost:3000";

/** The Polish A1 lessons in their defined order. The two `explanation` items of
 * the same level are reference notes, not lessons, and are not listed. */
const LESSON_TITLES_IN_ORDER = [
  "Greetings and goodbyes",
  "Introducing yourself",
  "Please, thank you and sorry",
];

/** Pixels by which the page is wider than the viewport (0 = no sideways scrolling). */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.locator("html").evaluate((root) => root.scrollWidth - root.clientWidth);
}

async function arrangeSignedIn(page: Page, request: Parameters<typeof registerAndVerifyUser>[0]) {
  const email = uniqueEmail("lessons");
  await registerAndVerifyUser(request, email, PASSWORD);
  await signInViaUi(page, email, PASSWORD);
  return email;
}

/** Opens Lessons the way a student does: the nav link, then Polish, then A1. */
async function openPolishA1Lessons(page: Page) {
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Lessons" })
    .click();
  await expect(page).toHaveURL(/\/learn\/lessons$/);
  await page
    .getByRole("navigation", { name: "Languages" })
    .getByRole("link", { name: /Polish/ })
    .click();
  await expect(page).toHaveURL(/\/learn\/lessons\?language=pl$/);
  await page.getByRole("navigation", { name: "Levels" }).getByRole("link", { name: "A1" }).click();
  await expect(page).toHaveURL(/\/learn\/lessons\?language=pl&level=a1$/);
  await expect(page.getByRole("list", { name: "Lessons" })).toBeVisible();
}

function lessonCard(page: Page, title: string) {
  return page
    .getByRole("list", { name: "Lessons" })
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 3, name: title }) });
}

async function openGreetings(page: Page) {
  await page.getByRole("link", { name: /: Greetings and goodbyes$/ }).click();
  await expect(page).toHaveURL(/\/learn\/lessons\/pl-greetings$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Greetings and goodbyes" }),
  ).toBeVisible();
}

test.describe("lesson discovery", () => {
  test("login, open Lessons: Polish and A1 are available and the lessons are listed in order", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);

    await openPolishA1Lessons(page);

    const cards = page.getByRole("list", { name: "Lessons" }).getByRole("listitem");
    await expect(cards).toHaveCount(LESSON_TITLES_IN_ORDER.length);
    const titles = await page.getByRole("heading", { level: 3 }).allTextContents();
    expect(titles).toEqual(LESSON_TITLES_IN_ORDER);
    await expect(cards.first()).toContainText("Lesson 1");
    await expect(cards.last()).toContainText("Lesson 3");
  });

  test("a lesson that has not been opened says Not started, and later levels are coming soon", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openPolishA1Lessons(page);

    await expect(lessonCard(page, "Greetings and goodbyes")).toContainText("Not started");
    const levels = page.getByRole("navigation", { name: "Levels" });
    await expect(levels.getByRole("listitem").filter({ hasText: "A2" })).toContainText(
      "Coming soon",
    );
  });

  test("the choice lives in the address, so a lessons link can be opened directly", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);

    await page.goto("/learn/lessons?language=pl&level=a1");

    await expect(page.getByRole("list", { name: "Lessons" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(
      LESSON_TITLES_IN_ORDER.length,
    );
  });

  test("the public content browser is unaffected: /learn/pl/a1 still lists all five items", async ({
    page,
  }) => {
    await page.goto("/learn/pl/a1");

    await expect(page.getByRole("list", { name: "Content" }).getByRole("listitem")).toHaveCount(5);
  });
});

test.describe("opening a lesson", () => {
  test("shows the title, then the content in order, with the Polish text tagged as Polish", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openPolishA1Lessons(page);

    await openGreetings(page);

    const article = page.getByRole("article");
    const polish = article.getByText("Dzień dobry.", { exact: true });
    await expect(polish).toBeVisible();
    await expect(polish).toHaveAttribute("lang", "pl-PL");
    await expect(article.getByText("Good day; hello.")).toBeVisible();
    // The explanation comes first, then the examples in the order they are written.
    const text = (await article.textContent()) ?? "";
    const order = [
      "Polish has more than one way to greet people",
      "Dzień dobry.",
      "Dobry wieczór.",
      "Cześć!",
      "Do widzenia.",
      "Na razie!",
      "Dobranoc.",
    ].map((fragment) => text.indexOf(fragment));
    expect(order.every((position) => position >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  test("opening a lesson marks it In progress, but never Completed", async ({ page, request }) => {
    await arrangeSignedIn(page, request);
    await openPolishA1Lessons(page);
    await openGreetings(page);
    await expect(page.getByRole("article").getByText("In progress")).toBeVisible();

    await page.getByRole("link", { name: "Back to lessons" }).click();

    await expect(page).toHaveURL(/\/learn\/lessons\?language=pl&level=a1$/);
    await expect(lessonCard(page, "Greetings and goodbyes")).toContainText("In progress");
    await expect(
      page.getByRole("link", { name: "Continue lesson: Greetings and goodbyes" }),
    ).toBeVisible();
    await expect(lessonCard(page, "Introducing yourself")).toContainText("Not started");
  });

  test("an in-progress lesson stays in progress after a refresh, and is still readable", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openPolishA1Lessons(page);
    await openGreetings(page);
    await expect(page.getByRole("article").getByText("In progress")).toBeVisible();

    await page.reload();

    await expect(page.getByRole("article").getByText("In progress")).toBeVisible();
    await expect(page.getByText("Dzień dobry.", { exact: true })).toBeVisible();
  });
});

test.describe("completing a lesson", () => {
  test("Complete lesson confirms, and the lesson is still completed after a refresh", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openPolishA1Lessons(page);
    await openGreetings(page);

    await page.getByRole("button", { name: "Complete lesson" }).click();

    const completion = page.getByRole("region", { name: "Finished this lesson?" });
    await expect(completion.getByRole("status")).toContainText("Lesson completed");
    await expect(page.getByRole("button", { name: "Complete lesson" })).toHaveCount(0);
    await expect(page.getByRole("article").locator('[data-status="completed"]')).toContainText(
      "Completed",
    );
    await expect(page.getByText("Dzień dobry.", { exact: true })).toBeVisible();

    await page.reload();

    await expect(completion.getByRole("status")).toContainText("Lesson completed");
    await expect(page.getByRole("button", { name: "Complete lesson" })).toHaveCount(0);
    await expect(page.getByText("Dzień dobry.", { exact: true })).toBeVisible();
  });

  test("the lessons list shows the completed lesson as Completed, in words, and offers to review it", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openPolishA1Lessons(page);
    await openGreetings(page);
    await page.getByRole("button", { name: "Complete lesson" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Lesson completed" })).toBeVisible();

    await page.getByRole("link", { name: "Back to lessons" }).click();

    await expect(lessonCard(page, "Greetings and goodbyes")).toContainText("Completed");
    await expect(
      page.getByRole("link", { name: "Review lesson: Greetings and goodbyes" }),
    ).toBeVisible();
    await expect(lessonCard(page, "Introducing yourself")).toContainText("Not started");
  });

  test("can be done from the keyboard alone", async ({ page, request }) => {
    await arrangeSignedIn(page, request);
    await openPolishA1Lessons(page);
    await openGreetings(page);

    const button = page.getByRole("button", { name: "Complete lesson" });
    await button.focus();
    await expect(button).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("status").filter({ hasText: "Lesson completed" })).toBeVisible();
  });

  test("repeated completion is idempotent: one completed lesson, with its first completion time", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openPolishA1Lessons(page);
    await openGreetings(page);

    const first = await page.request.post(`${API}/lessons/pl-greetings/complete`);
    const second = await page.request.post(`${API}/lessons/pl-greetings/complete`);
    const third = await page.request.post(`${API}/lessons/pl-greetings/complete`);

    expect([first.status(), second.status(), third.status()]).toEqual([200, 200, 200]);
    const firstBody = (await first.json()) as { status: string; completedAt: string };
    expect(firstBody.status).toBe("completed");
    expect(await second.json()).toEqual(firstBody);
    expect(await third.json()).toEqual(firstBody);
    const list = await page.request.get(`${API}/lessons?language=pl&level=a1`);
    const lessons = ((await list.json()) as { lessons: { progress: { status: string } }[] })
      .lessons;
    expect(lessons.filter((lesson) => lesson.progress.status === "completed")).toHaveLength(1);
  });

  test("clicking Complete lesson twice quickly still completes once", async ({ page, request }) => {
    await arrangeSignedIn(page, request);
    await openPolishA1Lessons(page);
    await openGreetings(page);
    const completions: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().endsWith("/lessons/pl-greetings/complete")) {
        completions.push(req.url());
      }
    });

    const button = page.getByRole("button", { name: "Complete lesson" });
    await button.dblclick();

    await expect(page.getByRole("status").filter({ hasText: "Lesson completed" })).toBeVisible();
    expect(completions).toHaveLength(1);
  });
});

test.describe("access control", () => {
  test("a logged-out visitor sent to a lesson page is sent to log in", async ({ page }) => {
    await page.goto("/learn/lessons/pl-greetings");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  });

  test("a logged-out visitor sent to the lessons list is sent to log in", async ({ page }) => {
    await page.goto("/learn/lessons?language=pl&level=a1");

    await expect(page).toHaveURL(/\/login/);
  });

  test("the lesson API refuses a logged-out client, for every route", async ({ request }) => {
    const list = await request.get(`${API}/lessons?language=pl&level=a1`);
    const one = await request.get(`${API}/lessons/pl-greetings`);
    const start = await request.post(`${API}/lessons/pl-greetings/start`);
    const complete = await request.post(`${API}/lessons/pl-greetings/complete`);

    expect([list.status(), one.status(), start.status(), complete.status()]).toEqual([
      401, 401, 401, 401,
    ]);
    expect(await one.json()).toEqual({ error: "Unauthenticated" });
  });

  test("another student's progress is invisible and cannot be set through the API", async ({
    page,
    request,
    browser,
  }) => {
    await arrangeSignedIn(page, request);
    await openPolishA1Lessons(page);
    await openGreetings(page);
    await page.getByRole("button", { name: "Complete lesson" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Lesson completed" })).toBeVisible();

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await arrangeSignedIn(otherPage, otherContext.request);
    await otherPage.goto("/learn/lessons?language=pl&level=a1");
    await expect(lessonCard(otherPage, "Greetings and goodbyes")).toContainText("Not started");

    // The other student cannot name someone else, or set a time or a status: the body is refused.
    const attempt = await otherContext.request.post(`${API}/lessons/pl-greetings/complete`, {
      data: {
        userId: "someone-else",
        completedAt: "1999-01-01T00:00:00.000Z",
        status: "completed",
      },
    });
    expect(attempt.status()).toBe(400);
    await otherPage.reload();
    await expect(lessonCard(otherPage, "Greetings and goodbyes")).toContainText("Not started");
    await otherContext.close();
  });
});

test.describe("lessons that are not there", () => {
  test("an unknown lesson shows a safe not-found page, with a way back, and does not echo the id", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);

    await page.goto("/learn/lessons/pl-does-not-exist");

    await expect(page.getByText("Lesson not found")).toBeVisible();
    await expect(page.getByText("pl-does-not-exist")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Complete lesson" })).toHaveCount(0);
    await page.getByRole("link", { name: "Back to lessons" }).click();
    await expect(page).toHaveURL(/\/learn\/lessons$/);
  });

  test("a malformed id gets the same safe page, and markup in it is inert", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);

    await page.goto(`/learn/lessons/${encodeURIComponent("<img src=x onerror=alert(1)>")}`);

    await expect(page.getByText("Lesson not found")).toBeVisible();
    await expect(page.locator("main img")).toHaveCount(0);
  });

  test("content that is not a lesson is not a lesson: its id opens the not-found page", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);

    await page.goto("/learn/lessons/pl-no-articles");

    await expect(page.getByText("Lesson not found")).toBeVisible();
    const api = await page.request.post(`${API}/lessons/pl-no-articles/complete`);
    expect(api.status()).toBe(404);
  });

  test("the API answers injection-like and traversal-like ids with 400, never a server error", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);

    for (const id of [
      encodeURIComponent("pl-greetings'; DROP TABLE lesson_progress;--"),
      "..%2F..%2Fetc%2Fpasswd",
      "PL-GREETINGS",
    ]) {
      const response = await page.request.get(`${API}/lessons/${id}`);
      expect(response.status()).toBe(400);
      expect(await response.json()).toEqual({ error: "Invalid request." });
    }
  });

  test("a planned level shows coming soon and no lessons", async ({ page, request }) => {
    await arrangeSignedIn(page, request);

    await page.goto("/learn/lessons?language=pl&level=a2");

    await expect(page.getByText(/A2 is coming soon for Polish/)).toBeVisible();
    await expect(page.getByRole("list", { name: "Lessons" })).toHaveCount(0);
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("the whole lesson flow works on a small screen, with no sideways scrolling", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await page.goto("/learn/lessons?language=pl&level=a1");
    await expect(page.getByRole("list", { name: "Lessons" })).toBeVisible();
    expect(await horizontalOverflow(page)).toBe(0);

    await page.getByRole("link", { name: /: Introducing yourself$/ }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Introducing yourself" }),
    ).toBeVisible();
    expect(await horizontalOverflow(page)).toBe(0);

    const complete = page.getByRole("button", { name: "Complete lesson" });
    await complete.scrollIntoViewIfNeeded();
    await expect(complete).toBeVisible();
    await complete.click();
    await expect(page.getByRole("status").filter({ hasText: "Lesson completed" })).toBeVisible();
    expect(await horizontalOverflow(page)).toBe(0);

    await page.getByRole("link", { name: "Back to lessons" }).click();
    await expect(lessonCard(page, "Introducing yourself")).toContainText("Completed");
  });
});

test.describe("dark mode", () => {
  test("the lessons list and the lesson viewer work in dark mode, including the completed state", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await page.getByRole("button", { name: "Toggle dark mode" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.goto("/learn/lessons?language=pl&level=a1");
    await expect(page.getByRole("list", { name: "Lessons" })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(lessonCard(page, "Greetings and goodbyes")).toContainText("Not started");

    await page.getByRole("link", { name: /: Greetings and goodbyes$/ }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Greetings and goodbyes" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Complete lesson" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Lesson completed" })).toBeVisible();

    // The page really is dark: its background is the dark surface, not the light one.
    const background = await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background).not.toBe("rgb(248, 249, 250)");
    await expect(page.getByText("Dzień dobry.", { exact: true })).toBeVisible();
  });
});
