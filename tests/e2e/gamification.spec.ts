import { expect, test, type APIResponse, type Page } from "@playwright/test";

import { registerAndVerifyUser, uniqueEmail } from "./helpers/register-and-verify.js";
import { signInViaUi } from "./helpers/ui.js";

/**
 * M8 — Gamification, end to end against the real API (NODE_ENV=test: real server, real HTTP,
 * in-process Postgres, the real shipped `content/` tree) behind the real dev server. Each test
 * uses its own fresh user, so points never leak between tests.
 *
 * The reward rules under test: +10 for the first correct answer to an exercise, +25 for the first
 * completion of a lesson, +50 for each achievement unlocked (first-exercise, first-lesson,
 * hundred-points here; ten-correct-exercises needs ten exercises and the shipped content has
 * nine, so it is proved at the application/database layers instead).
 */

const PASSWORD = "a-good-password-123";
const API = "http://localhost:3000";
const MC = "pl-greetings-polite-hello";
const TF = "pl-greetings-informal-hi";

interface RewardsBody {
  pointsAwarded: number;
  achievementsUnlocked: { key: string }[];
}
interface AnswerBody {
  correct: boolean;
  rewards: RewardsBody;
}
interface SummaryBody {
  totalPoints: number;
  achievements: { unlockedCount: number; totalCount: number };
  recentTransactions: { amount: number; reason: string }[];
}

async function jsonOf<T>(response: APIResponse): Promise<T> {
  return (await response.json()) as T;
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.locator("html").evaluate((root) => root.scrollWidth - root.clientWidth);
}

async function arrangeSignedIn(page: Page, request: Parameters<typeof registerAndVerifyUser>[0]) {
  const email = uniqueEmail("gamification");
  await registerAndVerifyUser(request, email, PASSWORD);
  await signInViaUi(page, email, PASSWORD);
  return email;
}

async function summary(page: Page): Promise<SummaryBody> {
  return jsonOf<SummaryBody>(await page.request.get(`${API}/gamification/summary`));
}

async function answerCorrectlyInUi(page: Page, exerciseId = MC) {
  await page.goto(`/learn/exercises/${exerciseId}`);
  await page.getByRole("radio", { name: "Dzień dobry" }).check();
  await page.getByRole("button", { name: "Check answer" }).click();
}

const notice = (page: Page) => page.getByTestId("reward-notice");

test.describe("earning points from exercises", () => {
  test("the first correct answer earns +10 and the first-exercise achievement, in the verdict", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);

    await answerCorrectlyInUi(page);

    await expect(page.getByRole("status")).toContainText("Correct");
    await expect(notice(page)).toContainText("+60 points");
    await expect(notice(page)).toContainText("Achievement unlocked: First exercise");
    expect((await summary(page)).totalPoints).toBe(60);
  });

  test("answering the same exercise correctly again earns nothing more, but is still an attempt", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await answerCorrectlyInUi(page);
    await expect(notice(page)).toBeVisible();

    await page.getByRole("button", { name: "Try again" }).click();
    await page.getByRole("radio", { name: "Dzień dobry" }).check();
    await page.getByRole("button", { name: "Check answer" }).click();

    await expect(page.getByRole("status")).toContainText("Attempt 2");
    await expect(notice(page)).toHaveCount(0);
    expect((await summary(page)).totalPoints).toBe(60);
  });

  test("a wrong answer earns nothing, and a later correct one is rewarded", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await page.goto(`/learn/exercises/${MC}`);
    await page.getByRole("radio", { name: "Cześć" }).check();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByRole("status")).toContainText("Not quite");
    await expect(notice(page)).toHaveCount(0);
    expect((await summary(page)).totalPoints).toBe(0);

    await page.getByRole("button", { name: "Try again" }).click();
    await page.getByRole("radio", { name: "Dzień dobry" }).check();
    await page.getByRole("button", { name: "Check answer" }).click();

    await expect(notice(page)).toContainText("+60 points");
  });

  test("the same correct answer sent many times at once is paid once", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);

    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        page.request.post(`${API}/exercises/${MC}/answer`, { data: { answer: "a" } }),
      ),
    );

    const bodies = await Promise.all(responses.map((r) => jsonOf<AnswerBody>(r)));
    expect(responses.every((r) => r.ok())).toBe(true);
    expect(bodies.filter((b) => b.rewards.pointsAwarded > 0)).toHaveLength(1);
    expect((await summary(page)).totalPoints).toBe(60);
  });

  test("a client cannot ask for points: naming them in an answer is refused, and there is no route for it", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);

    const named = await page.request.post(`${API}/exercises/${MC}/answer`, {
      data: { answer: "b", points: 1000, correct: true },
    });
    const award = await page.request.post(`${API}/gamification/award`, { data: { amount: 1000 } });
    const give = await page.request.post(`${API}/gamification/give-me-points`, {
      data: { userId: "x", amount: 1000 },
    });

    expect(named.status()).toBe(400);
    expect(award.status()).toBe(404);
    expect(give.status()).toBe(404);
    expect((await summary(page)).totalPoints).toBe(0);
  });
});

test.describe("earning points from lessons", () => {
  test("completing a lesson earns +25 and first-lesson, and completing it again earns nothing", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await page.goto("/learn/lessons/pl-greetings");

    await page.getByRole("button", { name: "Complete lesson" }).click();

    await expect(page.getByText("Lesson completed")).toBeVisible();
    await expect(notice(page)).toContainText("+75 points");
    await expect(notice(page)).toContainText("Achievement unlocked: First lesson");

    await page.reload();
    await expect(page.getByText("Lesson completed")).toBeVisible();
    await expect(notice(page)).toHaveCount(0);
    const again = await page.request.post(`${API}/lessons/pl-greetings/complete`);
    expect((await jsonOf<{ rewards: RewardsBody }>(again)).rewards.pointsAwarded).toBe(0);
    expect((await summary(page)).totalPoints).toBe(75);
  });

  test("completing a lesson twice at once (a double request) is paid once", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);

    await Promise.all(
      Array.from({ length: 5 }, () => page.request.post(`${API}/lessons/pl-greetings/complete`)),
    );

    expect((await summary(page)).totalPoints).toBe(75);
  });
});

test.describe("the dashboard and the achievements page", () => {
  async function earnEverything(page: Page) {
    await answerCorrectlyInUi(page); // 10 + first-exercise 50
    await expect(notice(page)).toBeVisible();
    await page.goto("/learn/lessons/pl-greetings");
    await page.getByRole("button", { name: "Complete lesson" }).click(); // 25 + first-lesson 50 -> 135 -> hundred-points 50
    await expect(notice(page)).toContainText("Achievement unlocked: First lesson");
  }

  test("the dashboard shows the total, the achievement count and the recent rewards, from the API", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await earnEverything(page);

    await page.getByRole("link", { name: "Dashboard" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    const card = page.getByRole("region", { name: "Your points" });
    await expect(card.getByText("185")).toBeVisible();
    await expect(card.getByText("3 / 4")).toBeVisible();
    const recent = card.getByRole("list", { name: "Points history" }).getByRole("listitem");
    await expect(recent).toHaveCount(5);
    await expect(recent.first()).toContainText("Achievement unlocked: One hundred points");
  });

  test("the achievements page lists unlocked and locked achievements with progress, and the history", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await earnEverything(page);

    await page.getByRole("link", { name: "Achievements" }).click();

    await expect(page).toHaveURL(/\/achievements$/);
    await expect(page.getByRole("heading", { level: 1, name: "Achievements" })).toBeVisible();
    await expect(page.getByText("3 of 4 unlocked")).toBeVisible();
    const unlocked = page
      .getByRole("heading", { name: "First exercise" })
      .locator("xpath=ancestor::li");
    await expect(unlocked).toContainText("Unlocked");
    const locked = page
      .getByRole("heading", { name: "Ten exercises" })
      .locator("xpath=ancestor::li");
    await expect(locked).toContainText("Locked");
    await expect(locked).toContainText("1 / 10");
    await expect(locked.getByRole("progressbar")).toHaveAttribute("value", "1");
    const history = page.getByRole("list", { name: "Points history" }).getByRole("listitem");
    await expect(history).toHaveCount(5);
  });

  test("a new student starts at zero and is told how to earn the first points", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);

    await page.goto("/dashboard");

    const card = page.getByRole("region", { name: "Your points" });
    await expect(card.getByText("0 / 4")).toBeVisible();
    await expect(
      card.getByText("No points yet. Complete an exercise or a lesson to earn your first points."),
    ).toBeVisible();
    expect((await summary(page)).totalPoints).toBe(0);
  });

  test("after logging out and in as someone else, the dashboard shows that student's own points", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await answerCorrectlyInUi(page);
    await expect(notice(page)).toBeVisible();
    await page.goto("/dashboard");
    await expect(page.getByText("60", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login/);

    const other = uniqueEmail("gamification-other");
    await registerAndVerifyUser(request, other, PASSWORD);
    await signInViaUi(page, other, PASSWORD);
    await page.goto("/dashboard");

    const card = page.getByRole("region", { name: "Your points" });
    await expect(card.getByText("0 / 4")).toBeVisible();
    await expect(page.getByText("60", { exact: true })).toHaveCount(0);
  });

  test("the pages work on a small screen without sideways scrolling, and in dark mode", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await earnEverything(page);
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/dashboard");
    await expect(page.getByRole("region", { name: "Your points" })).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    await page.goto("/achievements");
    await expect(page.getByRole("heading", { name: "Ten exercises" })).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

    await page.getByRole("button", { name: "Toggle dark mode" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("heading", { name: "First exercise" })).toBeVisible();
    await expect(page.getByText("3 of 4 unlocked")).toBeVisible();
  });

  test("the achievements page is usable with the keyboard alone", async ({ page, request }) => {
    await arrangeSignedIn(page, request);
    await page.goto("/dashboard");
    await expect(page.getByRole("region", { name: "Your points" })).toBeVisible();

    const link = page.getByRole("link", { name: "View all achievements" });
    await link.focus();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/achievements$/);
    await expect(page.getByRole("heading", { level: 1, name: "Achievements" })).toBeVisible();
  });
});

test.describe("privacy and authorization", () => {
  test("a logged-out visitor is sent to log in and every gamification route refuses them", async ({
    page,
    request,
  }) => {
    await page.goto("/achievements");
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);

    for (const path of ["summary", "achievements", "point-transactions"]) {
      const response = await request.get(`${API}/gamification/${path}`);
      expect(response.status()).toBe(401);
    }
  });

  test("one student's points are invisible to another, and a user id cannot be named", async ({
    page,
    request,
    browser,
  }) => {
    await arrangeSignedIn(page, request);
    await answerCorrectlyInUi(page);
    await expect(notice(page)).toBeVisible();
    const me = await jsonOf<{ id: string }>(await page.request.get(`${API}/auth/me`));

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await arrangeSignedIn(otherPage, otherContext.request);
    const theirs = await jsonOf<SummaryBody>(
      await otherContext.request.get(`${API}/gamification/summary`),
    );
    const named = await otherContext.request.get(`${API}/gamification/summary?userId=${me.id}`);
    const path = await otherContext.request.get(`${API}/users/${me.id}/gamification`);
    const history = await otherContext.request.get(
      `${API}/gamification/point-transactions?userId=${me.id}`,
    );

    expect(theirs.totalPoints).toBe(0);
    expect(theirs.recentTransactions).toEqual([]);
    expect(named.status()).toBe(400);
    expect(history.status()).toBe(400);
    expect(path.status()).toBe(404);
    expect((await summary(page)).totalPoints).toBe(60);
    await otherContext.close();
  });

  test("the responses carry no user id and are not cacheable", async ({ page, request }) => {
    await arrangeSignedIn(page, request);
    await answerCorrectlyInUi(page);
    await expect(notice(page)).toBeVisible();
    const me = await jsonOf<{ id: string }>(await page.request.get(`${API}/auth/me`));

    for (const path of ["summary", "achievements", "point-transactions"]) {
      const response = await page.request.get(`${API}/gamification/${path}`);
      expect(response.headers()["cache-control"]).toBe("private, no-store");
      const text = await response.text();
      expect(text).not.toContain(me.id);
      expect(text).not.toMatch(/userId|user_id/);
    }
  });

  test("the history endpoint refuses malformed paging instead of guessing", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);

    for (const query of ["limit=0", "limit=999", "limit=abc", "before=-1", "before=1;DROP"]) {
      const response = await page.request.get(`${API}/gamification/point-transactions?${query}`);
      expect(response.status()).toBe(400);
      expect(await response.json()).toEqual({ error: "Invalid request." });
    }
  });

  test("answering the wrong exercise id for points is a safe not-found, and earns nothing", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);

    const missing = await page.request.post(`${API}/exercises/pl-greetings-nope/answer`, {
      data: { answer: true },
    });
    const statement = await page.request.post(`${API}/exercises/${TF}/answer`, {
      data: { answer: "not-a-boolean" },
    });

    expect(missing.status()).toBe(404);
    expect(statement.status()).toBe(400);
    expect((await summary(page)).totalPoints).toBe(0);
  });
});
