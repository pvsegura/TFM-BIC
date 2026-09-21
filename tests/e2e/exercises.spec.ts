import { expect, test, type APIResponse, type Page } from "@playwright/test";

import { registerAndVerifyUser, uniqueEmail } from "./helpers/register-and-verify.js";
import { signInViaUi } from "./helpers/ui.js";

/**
 * M7 — Exercises, end to end against the real API (NODE_ENV=test: real server,
 * real HTTP, in-process Postgres, the real shipped `content/` tree) behind the
 * real dev server. Each test uses its own fresh user, so attempts never leak
 * between tests.
 */

const PASSWORD = "a-good-password-123";
const API = "http://localhost:3000";

const MC_PROMPT = "Which greeting is polite and suits someone you do not know well?";
const TF_PROMPT = "Cześć is informal. It can be used to say hello and also to say goodbye.";
const TEXT_PROMPT = "Type the Polish for: Good night.";

/** The three exercises of the Greetings lesson, in their defined order. */
const GREETINGS_EXERCISES = {
  choice: "pl-greetings-polite-hello",
  statement: "pl-greetings-informal-hi",
  typed: "pl-greetings-good-night",
};

/** Words that would give an answer away if they appeared before an answer was submitted. */
const ANSWER_KEY =
  /correctOptionId|acceptedAnswers|correctAnswer|caseSensitive|configuration|explanation/;

interface ResultBody {
  status: string;
  attemptCount: number;
  lastAnsweredAt: string | null;
}
interface ExerciseBody {
  result: ResultBody;
}
interface VerdictBody {
  correct: boolean;
  result: ResultBody;
}

async function jsonOf<T>(response: APIResponse): Promise<T> {
  return (await response.json()) as T;
}

/** Pixels by which the page is wider than the viewport (0 = no sideways scrolling). */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.locator("html").evaluate((root) => root.scrollWidth - root.clientWidth);
}

async function arrangeSignedIn(page: Page, request: Parameters<typeof registerAndVerifyUser>[0]) {
  const email = uniqueEmail("exercises");
  await registerAndVerifyUser(request, email, PASSWORD);
  await signInViaUi(page, email, PASSWORD);
  return email;
}

async function openGreetingsLesson(page: Page) {
  await page.goto("/learn/lessons/pl-greetings");
  await expect(
    page.getByRole("heading", { level: 1, name: "Greetings and goodbyes" }),
  ).toBeVisible();
}

async function openExercise(page: Page, id: string) {
  await page.goto(`/learn/exercises/${id}`);
  await expect(page.getByRole("heading", { level: 1, name: /^Exercise/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Check answer" })).toBeVisible();
}

const result = (page: Page) => page.getByRole("status");
const check = (page: Page) => page.getByRole("button", { name: "Check answer" });

test.describe("discovering exercises from a lesson", () => {
  test("login → open a lesson → its exercises are listed in order, with kind and state", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Lessons" })
      .click();
    await page
      .getByRole("navigation", { name: "Languages" })
      .getByRole("link", { name: /Polish/ })
      .click();
    await page
      .getByRole("navigation", { name: "Levels" })
      .getByRole("link", { name: "A1" })
      .click();
    await page.getByRole("link", { name: /: Greetings and goodbyes$/ }).click();
    await expect(page).toHaveURL(/\/learn\/lessons\/pl-greetings$/);

    await expect(page.getByRole("heading", { level: 2, name: "Practice" })).toBeVisible();
    await expect(page.getByText("0 of 3 exercises answered")).toBeVisible();
    const items = page.getByRole("list", { name: "Exercises" }).getByRole("listitem");
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toContainText("Exercise 1 · Multiple choice");
    await expect(items.nth(0)).toContainText(MC_PROMPT);
    await expect(items.nth(1)).toContainText("Exercise 2 · True or false");
    await expect(items.nth(2)).toContainText("Exercise 3 · Text answer");
    for (let index = 0; index < 3; index += 1) {
      await expect(items.nth(index)).toContainText("Not answered");
    }
  });

  test("opening an exercise from the lesson's list leads to its page", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openGreetingsLesson(page);

    await page.getByRole("link", { name: "Start exercise 1" }).click();

    await expect(page).toHaveURL(new RegExp(`/learn/exercises/${GREETINGS_EXERCISES.choice}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Exercise 1 of 3" })).toBeVisible();
    await expect(page.getByRole("group", { name: MC_PROMPT })).toBeVisible();
  });

  test("a lesson with exercises is still only completed by its own explicit action", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openExercise(page, GREETINGS_EXERCISES.choice);
    await page.getByRole("radio", { name: "Dzień dobry" }).check();
    await check(page).click();
    await expect(result(page)).toContainText("Correct");

    await openGreetingsLesson(page);

    await expect(page.getByRole("button", { name: "Complete lesson" })).toBeVisible();
    await expect(page.getByText("Lesson completed")).toHaveCount(0);
  });
});

test.describe("multiple choice", () => {
  test("select the right option, submit, and see it is correct", async ({ page, request }) => {
    await arrangeSignedIn(page, request);
    await openExercise(page, GREETINGS_EXERCISES.choice);

    await page.getByRole("radio", { name: "Dzień dobry" }).check();
    await check(page).click();

    await expect(result(page)).toContainText("Correct");
    await expect(result(page)).toContainText("Correct answer: Dzień dobry");
    await expect(result(page)).toContainText("Dzień dobry is polite and works with people");
    await expect(result(page)).toContainText("Attempt 1");
  });

  test("select a wrong option, submit, and see it is not correct, with the right answer", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openExercise(page, GREETINGS_EXERCISES.choice);

    await page.getByRole("radio", { name: "Cześć" }).check();
    await check(page).click();

    await expect(result(page)).toContainText("Not quite");
    await expect(result(page)).toContainText("Correct answer: Dzień dobry");
  });

  test("shows nothing about the answer until one is submitted, and refuses an empty submission", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openExercise(page, GREETINGS_EXERCISES.choice);

    await expect(page.getByText(/Correct answer/)).toHaveCount(0);
    await expect(page.getByText("Dzień dobry is polite")).toHaveCount(0);
    for (const radio of await page.getByRole("radio").all()) {
      await expect(radio).not.toBeChecked();
    }
    await check(page).click();
    await expect(page.getByRole("alert")).toContainText("Choose an answer.");
    await expect(result(page)).toBeEmpty();
  });

  test("can be answered with the keyboard alone", async ({ page, request }) => {
    await arrangeSignedIn(page, request);
    await openExercise(page, GREETINGS_EXERCISES.choice);

    await page.getByRole("radio", { name: "Dzień dobry" }).focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab");
    await expect(check(page)).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(result(page)).toContainText("Correct");
    await expect(result(page)).toBeFocused();
  });
});

test.describe("text answers", () => {
  test("enter the answer, submit, see the result, retry, and the second attempt works", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openExercise(page, GREETINGS_EXERCISES.typed);

    await page.getByLabel(TEXT_PROMPT).fill("dobra noc");
    await check(page).click();
    await expect(result(page)).toContainText("Not quite");
    await expect(result(page)).toContainText("Correct answer: Dobranoc");
    await expect(result(page)).toContainText("Attempt 1");

    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByLabel(TEXT_PROMPT)).toHaveValue("");
    await expect(page.getByLabel(TEXT_PROMPT)).toBeFocused();
    await page.getByLabel(TEXT_PROMPT).fill("  DOBRANOC ");
    await check(page).click();

    await expect(result(page)).toContainText("Correct");
    await expect(result(page)).toContainText("Attempt 2");
  });

  test("Enter submits, and only an explicitly listed variant is accepted", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openExercise(page, GREETINGS_EXERCISES.typed);

    await page.getByLabel(TEXT_PROMPT).fill("Dobranoc.");
    await page.getByLabel(TEXT_PROMPT).press("Enter");
    await expect(result(page)).toContainText("Correct");

    await page.getByRole("button", { name: "Try again" }).click();
    await page.getByLabel(TEXT_PROMPT).fill("Dobranoc!");
    await page.getByLabel(TEXT_PROMPT).press("Enter");
    await expect(result(page)).toContainText("Not quite");
  });

  test("Polish diacritics are kept: the answer without them is not correct, with them it is", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openExercise(page, "pl-polite-words-thank-you");
    const prompt = "Type the Polish word for: thank you.";

    await page.getByLabel(prompt).fill("Dziekuje");
    await check(page).click();
    await expect(result(page)).toContainText("Not quite");
    await expect(result(page)).toContainText("Correct answer: Dziękuję");

    await page.getByRole("button", { name: "Try again" }).click();
    await page.getByLabel(prompt).fill("Dziękuję");
    await check(page).click();
    await expect(result(page)).toContainText("Correct");
  });

  test("an empty answer is refused with a message, and is not an attempt", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openExercise(page, GREETINGS_EXERCISES.typed);

    await check(page).click();

    await expect(page.getByRole("alert")).toContainText("Enter an answer.");
    const detail = await page.request.get(`${API}/exercises/${GREETINGS_EXERCISES.typed}`);
    expect((await jsonOf<ExerciseBody>(detail)).result).toEqual({
      status: "unanswered",
      attemptCount: 0,
      lastAnsweredAt: null,
    });
  });
});

test.describe("true / false", () => {
  test("select an answer, submit, and see the result", async ({ page, request }) => {
    await arrangeSignedIn(page, request);
    await openExercise(page, GREETINGS_EXERCISES.statement);

    await page.getByRole("radio", { name: "True" }).check();
    await check(page).click();

    await expect(result(page)).toContainText("Correct");
    await expect(result(page)).toContainText("Correct answer: True");
  });

  test("an answer that is false can be right: choosing False is correct for a false statement", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openExercise(page, "pl-polite-words-tak-means-no");

    await page.getByRole("radio", { name: "False" }).check();
    await check(page).click();

    await expect(result(page)).toContainText("Correct");
    await expect(result(page)).toContainText("Correct answer: False");
  });

  test("the wrong choice is not correct, and the true/false controls state their meaning in words", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openExercise(page, GREETINGS_EXERCISES.statement);
    await expect(page.getByRole("group", { name: TF_PROMPT })).toBeVisible();

    await page.getByRole("radio", { name: "False" }).check();
    await check(page).click();

    await expect(result(page)).toContainText("Not quite");
    await expect(result(page)).toContainText("Correct answer: True");
  });
});

test.describe("attempts are persisted", () => {
  test("after a refresh the exercise remembers the last attempt and how many there were", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openExercise(page, GREETINGS_EXERCISES.choice);
    await page.getByRole("radio", { name: "Cześć" }).check();
    await check(page).click();
    await expect(result(page)).toContainText("Attempt 1");
    await page.getByRole("button", { name: "Try again" }).click();
    await page.getByRole("radio", { name: "Dzień dobry" }).check();
    await check(page).click();
    await expect(result(page)).toContainText("Attempt 2");

    await page.reload();

    await expect(
      page.getByText("Your last attempt was correct (2 attempts so far)."),
    ).toBeVisible();
    // The verdict itself is not replayed: the exercise starts fresh, and nothing is revealed.
    await expect(page.getByText(/Correct answer/)).toHaveCount(0);
    await expect(check(page)).toBeEnabled();
  });

  test("the lesson's list shows each exercise's latest result and the answered count after a refresh", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openExercise(page, GREETINGS_EXERCISES.choice);
    await page.getByRole("radio", { name: "Dzień dobry" }).check();
    await check(page).click();
    await expect(result(page)).toContainText("Correct");
    await openExercise(page, GREETINGS_EXERCISES.statement);
    await page.getByRole("radio", { name: "False" }).check();
    await check(page).click();
    await expect(result(page)).toContainText("Not quite");

    await openGreetingsLesson(page);
    await page.reload();

    const items = page.getByRole("list", { name: "Exercises" }).getByRole("listitem");
    await expect(page.getByText("2 of 3 exercises answered")).toBeVisible();
    await expect(items.nth(0)).toContainText("Correct");
    await expect(items.nth(1)).toContainText("Not correct");
    await expect(items.nth(2)).toContainText("Not answered");
    await expect(page.getByRole("link", { name: "Try again: exercise 2" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Practise again: exercise 1" })).toBeVisible();
  });

  test("a double-click on Check answer is one attempt, not two", async ({ page, request }) => {
    await arrangeSignedIn(page, request);
    await openExercise(page, GREETINGS_EXERCISES.choice);
    await page.getByRole("radio", { name: "Dzień dobry" }).check();

    await check(page).dblclick();

    await expect(result(page)).toContainText("Attempt 1");
    const detail = await page.request.get(`${API}/exercises/${GREETINGS_EXERCISES.choice}`);
    expect((await jsonOf<ExerciseBody>(detail)).result.attemptCount).toBe(1);
  });

  test("a retry never changes an earlier attempt: the count only grows", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openExercise(page, GREETINGS_EXERCISES.statement);

    for (const [name, attempt] of [
      ["False", 1],
      ["False", 2],
      ["True", 3],
    ] as const) {
      await page.getByRole("radio", { name }).check();
      await check(page).click();
      await expect(result(page)).toContainText(`Attempt ${String(attempt)}`);
      if (attempt < 3) {
        await page.getByRole("button", { name: "Try again" }).click();
      }
    }
    const detail = await page.request.get(`${API}/exercises/${GREETINGS_EXERCISES.statement}`);
    expect((await jsonOf<ExerciseBody>(detail)).result).toMatchObject({
      status: "correct",
      attemptCount: 3,
    });
  });
});

test.describe("moving through a lesson's exercises", () => {
  test("next exercise, next exercise, then back to the lesson — and the lesson is not completed", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openGreetingsLesson(page);
    await page.getByRole("link", { name: "Start exercise 1" }).click();

    await page.getByRole("radio", { name: "Dzień dobry" }).check();
    await check(page).click();
    await expect(page.getByText(/answered every exercise/)).toHaveCount(0);
    await page.getByRole("link", { name: "Next exercise" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Exercise 2 of 3" })).toBeVisible();
    await expect(result(page)).toBeEmpty();
    await page.getByRole("radio", { name: "True" }).check();
    await check(page).click();
    await page.getByRole("link", { name: "Next exercise" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Exercise 3 of 3" })).toBeVisible();
    await page.getByLabel(TEXT_PROMPT).fill("Dobranoc");
    await check(page).click();
    await expect(page.getByText("You have answered every exercise in this lesson.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Next exercise" })).toHaveCount(0);

    await page.getByRole("link", { name: "Back to lesson" }).click();
    await expect(page).toHaveURL(/\/learn\/lessons\/pl-greetings$/);
    await expect(page.getByText("3 of 3 exercises answered")).toBeVisible();
    await expect(page.getByRole("button", { name: "Complete lesson" })).toBeVisible();
    await expect(page.getByText("Lesson completed")).toHaveCount(0);
  });
});

test.describe("the answer key stays on the server", () => {
  test("neither the exercise page's responses nor its screen reveal the answer before a submission", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    const bodies: string[] = [];
    page.on("response", (response) => {
      // Only the exercise endpoints (`/exercises/:id`, `/lessons/:id/exercises`): the lesson body's
      // own block type is also called "explanation" and is not an answer key.
      if (/\/exercises(\/|$)/.test(new URL(response.url()).pathname)) {
        void response.text().then((text) => bodies.push(`${response.url()} ${text}`));
      }
    });

    await openExercise(page, GREETINGS_EXERCISES.choice);
    await expect(page.getByRole("group", { name: MC_PROMPT })).toBeVisible();
    await openExercise(page, GREETINGS_EXERCISES.typed);
    await expect(page.getByLabel(TEXT_PROMPT)).toBeVisible();
    await openGreetingsLesson(page);
    await expect(page.getByRole("list", { name: "Exercises" })).toBeVisible();

    await expect
      .poll(() => bodies.filter((body) => body.includes("/exercises/pl-greetings-")).length)
      .toBeGreaterThanOrEqual(2);
    for (const body of bodies) {
      expect(body, body).not.toMatch(ANSWER_KEY);
      expect(body).not.toContain("Dzień dobry is polite and works");
    }
  });

  test("the exercise API's presentation has exactly the fields a student needs", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);

    const choice = await page.request.get(`${API}/exercises/${GREETINGS_EXERCISES.choice}`);
    const typed = await page.request.get(`${API}/exercises/${GREETINGS_EXERCISES.typed}`);
    const statement = await page.request.get(`${API}/exercises/${GREETINGS_EXERCISES.statement}`);

    const shape = async (response: typeof choice) =>
      Object.keys(await jsonOf<object>(response)).sort();
    const base = [
      "id",
      "instructionLanguage",
      "languageId",
      "lessonId",
      "levelId",
      "order",
      "prompt",
      "result",
      "type",
    ];
    expect(await shape(choice)).toEqual([...base, "options"].sort());
    expect(await shape(typed)).toEqual(base);
    expect(await shape(statement)).toEqual(base);
    expect(await choice.text()).not.toMatch(ANSWER_KEY);
    expect(await typed.text()).not.toContain("Dobranoc");
  });

  test("the verdict endpoint returns the verdict and nothing more", async ({ page, request }) => {
    await arrangeSignedIn(page, request);

    const verdict = await page.request.post(
      `${API}/exercises/${GREETINGS_EXERCISES.typed}/answer`,
      {
        data: { answer: "wrong" },
      },
    );

    expect(verdict.status()).toBe(200);
    const body = await jsonOf<VerdictBody & { correctAnswer: unknown; feedback: unknown }>(verdict);
    // M8 adds `rewards` (what the answer earned — nothing, for a wrong answer); still no answer key.
    expect(Object.keys(body).sort()).toEqual([
      "correct",
      "correctAnswer",
      "feedback",
      "result",
      "rewards",
    ]);
    expect((body as { rewards: unknown }).rewards).toEqual({
      pointsAwarded: 0,
      achievementsUnlocked: [],
    });
    expect(body.correct).toBe(false);
    expect(JSON.stringify(body)).not.toContain("Dobranoc.");
  });
});

test.describe("the server is authoritative", () => {
  test("a client cannot supply a verdict, a user, a score or a time", async ({ page, request }) => {
    await arrangeSignedIn(page, request);
    const url = `${API}/exercises/${GREETINGS_EXERCISES.choice}/answer`;

    const forged = await page.request.post(url, {
      data: { answer: "opt-x", correct: true, userId: "someone-else", score: 999999 },
    });
    const dated = await page.request.post(url, {
      data: { answer: "b", answeredAt: "1999-01-01T00:00:00.000Z" },
    });
    const honest = await page.request.post(url, { data: { answer: "b" } });

    expect(forged.status()).toBe(400);
    expect(dated.status()).toBe(400);
    expect(honest.status()).toBe(200);
    const body = await jsonOf<VerdictBody>(honest);
    expect(body.correct).toBe(false);
    // Only the one honest answer became an attempt, and its time is the server's.
    expect(body.result.attemptCount).toBe(1);
    expect(new Date(String(body.result.lastAnsweredAt)).getFullYear()).toBeGreaterThan(2000);
  });

  test("an answer that is not a real answer to this exercise is refused, and is not an attempt", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);

    const unknownOption = await page.request.post(
      `${API}/exercises/${GREETINGS_EXERCISES.choice}/answer`,
      { data: { answer: "not-an-option" } },
    );
    const wrongShape = await page.request.post(
      `${API}/exercises/${GREETINGS_EXERCISES.statement}/answer`,
      { data: { answer: "true" } },
    );

    expect(unknownOption.status()).toBe(400);
    expect(await unknownOption.json()).toEqual({ error: "Invalid answer." });
    expect(wrongShape.status()).toBe(400);
    const detail = await page.request.get(`${API}/exercises/${GREETINGS_EXERCISES.choice}`);
    expect((await jsonOf<ExerciseBody>(detail)).result.attemptCount).toBe(0);
  });
});

test.describe("access", () => {
  test("a logged-out visitor is sent to log in and never sees the exercise", async ({ page }) => {
    await page.goto(`/learn/exercises/${GREETINGS_EXERCISES.choice}`);

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(MC_PROMPT)).toHaveCount(0);
  });

  test("the exercise API refuses a logged-out client, on every route", async ({ request }) => {
    const list = await request.get(`${API}/lessons/pl-greetings/exercises`);
    const one = await request.get(`${API}/exercises/${GREETINGS_EXERCISES.choice}`);
    const answer = await request.post(`${API}/exercises/${GREETINGS_EXERCISES.choice}/answer`, {
      data: { answer: "opt-a" },
    });

    expect([list.status(), one.status(), answer.status()]).toEqual([401, 401, 401]);
    expect(await one.json()).toEqual({ error: "Unauthenticated" });
  });

  test("another student's attempts are invisible and cannot be touched through the API", async ({
    page,
    request,
    browser,
  }) => {
    await arrangeSignedIn(page, request);
    await openExercise(page, GREETINGS_EXERCISES.choice);
    await page.getByRole("radio", { name: "Dzień dobry" }).check();
    await check(page).click();
    await expect(result(page)).toContainText("Correct");

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await arrangeSignedIn(otherPage, otherContext.request);
    await otherPage.goto("/learn/lessons/pl-greetings");
    const items = otherPage.getByRole("list", { name: "Exercises" }).getByRole("listitem");
    await expect(items.nth(0)).toContainText("Not answered");
    await expect(otherPage.getByText("0 of 3 exercises answered")).toBeVisible();

    // They can only answer as themselves: the first student's history is untouched.
    const theirs = await otherContext.request.post(
      `${API}/exercises/${GREETINGS_EXERCISES.choice}/answer`,
      { data: { answer: "opt-b" } },
    );
    expect([200, 400]).toContain(theirs.status());
    const mine = await page.request.get(`${API}/exercises/${GREETINGS_EXERCISES.choice}`);
    expect((await jsonOf<ExerciseBody>(mine)).result).toMatchObject({
      status: "correct",
      attemptCount: 1,
    });
    await otherContext.close();
  });
});

test.describe("exercises that are not there", () => {
  test("an unknown exercise shows a safe not-found page with a way back, and does not echo the id", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);

    await page.goto("/learn/exercises/pl-secret-draft-exercise");

    await expect(page.getByRole("heading", { name: "Exercise not found" })).toBeVisible();
    await expect(page.getByText("pl-secret-draft-exercise")).toHaveCount(0);
    await page.getByRole("link", { name: "Back to lessons" }).click();
    await expect(page).toHaveURL(/\/learn\/lessons$/);
  });

  test("a malformed id is the same safe not-found", async ({ page, request }) => {
    await arrangeSignedIn(page, request);

    await page.goto("/learn/exercises/..%2F..%2Fetc%2Fpasswd");

    await expect(page.getByRole("heading", { name: "Exercise not found" })).toBeVisible();
  });

  test("the API answers injection-like and traversal-like ids with 400, never a server error", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    const ids = [
      encodeURIComponent("pl-x'; DROP TABLE exercise_attempts;--"),
      encodeURIComponent("../../etc/passwd"),
      encodeURIComponent("<script>alert(1)</script>"),
      "PL-UPPERCASE",
      `pl-${"a".repeat(80)}`,
    ];

    for (const id of ids) {
      const read = await page.request.get(`${API}/exercises/${id}`);
      const write = await page.request.post(`${API}/exercises/${id}/answer`, {
        data: { answer: true },
      });
      expect([read.status(), write.status()]).toEqual([400, 400]);
      expect(await read.json()).toEqual({ error: "Invalid request." });
    }
  });

  test("a well-formed id that names no exercise is a 404 with a fixed message", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);

    const read = await page.request.get(`${API}/exercises/pl-no-such-exercise`);
    const write = await page.request.post(`${API}/exercises/pl-no-such-exercise/answer`, {
      data: { answer: true },
    });

    expect([read.status(), write.status()]).toEqual([404, 404]);
    expect(await read.json()).toEqual({ error: "Exercise not found." });
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("the whole exercise flow works on a small screen, with no sideways scrolling", async ({
    page,
    request,
  }) => {
    await arrangeSignedIn(page, request);
    await openGreetingsLesson(page);
    await page.getByRole("link", { name: "Start exercise 1" }).scrollIntoViewIfNeeded();
    expect(await horizontalOverflow(page)).toBe(0);
    await page.getByRole("link", { name: "Start exercise 1" }).click();

    await expect(page.getByRole("group", { name: MC_PROMPT })).toBeVisible();
    expect(await horizontalOverflow(page)).toBe(0);
    await page.getByRole("radio", { name: "Dzień dobry" }).check();
    await check(page).scrollIntoViewIfNeeded();
    await check(page).click();
    await expect(result(page)).toContainText("Correct");
    expect(await horizontalOverflow(page)).toBe(0);

    await page.getByRole("link", { name: "Next exercise" }).click();
    await page.getByRole("radio", { name: "True" }).check();
    await check(page).click();
    await page.getByRole("link", { name: "Next exercise" }).click();
    await page.getByLabel(TEXT_PROMPT).fill("Dobranoc");
    await check(page).click();
    await expect(result(page)).toContainText("Correct");
    expect(await horizontalOverflow(page)).toBe(0);
  });

  test("the options are large enough to tap", async ({ page, request }) => {
    await arrangeSignedIn(page, request);
    await openExercise(page, GREETINGS_EXERCISES.choice);

    const box = await page.getByRole("radio", { name: "Dzień dobry" }).locator("..").boundingBox();

    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});

test.describe("dark mode", () => {
  test("the exercise list, player and verdict work in dark mode", async ({ page, request }) => {
    await arrangeSignedIn(page, request);
    await page.getByRole("button", { name: "Toggle dark mode" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await openGreetingsLesson(page);
    await expect(page.getByRole("list", { name: "Exercises" })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("link", { name: "Start exercise 1" }).click();
    await page.getByRole("radio", { name: "Cześć" }).check();
    await check(page).click();

    await expect(result(page)).toContainText("Not quite");
    await expect(result(page)).toContainText("Correct answer: Dzień dobry");
    await expect(page.locator("html")).toHaveClass(/dark/);
    const background = await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background).not.toBe("rgb(248, 249, 250)");
  });
});
