import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { registerAndVerifyUser, uniqueEmail } from "./helpers/register-and-verify.js";
import { signInViaUi } from "./helpers/ui.js";

/**
 * M13 — Teacher dashboard, end to end against the real API (NODE_ENV=test: real server, real
 * HTTP, in-process Postgres, the real shipped content) behind the real dev server.
 *
 * Deterministic data, fresh per test: teacher A with student Ana, teacher B with student Bo. Ana
 * starts and completes the `pl-greetings` lesson and answers one exercise wrong then right
 * (2 attempts, 1 correct → 50%). Teachers and links are created through the NODE_ENV=test-only
 * support route, which runs the same operator use cases as `pnpm teacher:admin` (ADR-024).
 */

const PASSWORD = "a-good-password-123";
const API = "http://localhost:3000";
const LESSON = "pl-greetings";
const EXERCISE = "pl-greetings-polite-hello";

interface Classroom {
  teacherA: string;
  teacherB: string;
  anaId: string;
  boId: string;
}

async function signInApi(request: APIRequestContext, email: string): Promise<string> {
  const response = await request.post(`${API}/auth/login`, { data: { email, password: PASSWORD } });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { id: string }).id;
}

async function link(request: APIRequestContext, teacherEmail: string, studentEmail: string) {
  const response = await request.post(`${API}/teacher-dashboard/_test/links`, {
    data: { teacherEmail, studentEmail },
  });
  expect(response.status()).toBe(204);
}

async function arrangeClassroom(playwright: {
  request: { newContext: () => Promise<APIRequestContext> };
}): Promise<Classroom> {
  const setup = await playwright.request.newContext();
  const emails = {
    teacherA: uniqueEmail("teacher-a"),
    teacherB: uniqueEmail("teacher-b"),
    ana: uniqueEmail("ana"),
    bo: uniqueEmail("bo"),
  };
  for (const email of Object.values(emails)) {
    await registerAndVerifyUser(setup, email, PASSWORD);
  }

  // Ana's own session does her learning — the teacher only ever reads it.
  const ana = await playwright.request.newContext();
  const anaId = await signInApi(ana, emails.ana);
  expect(
    (
      await ana.patch(`${API}/profile`, {
        data: { firstName: "Ana", lastName: "Nowak" },
        headers: { Accept: "application/json" },
      })
    ).ok(),
  ).toBe(true);
  expect((await ana.post(`${API}/lessons/${LESSON}/start`)).ok()).toBe(true);
  expect(
    (await ana.post(`${API}/exercises/${EXERCISE}/answer`, { data: { answer: "b" } })).ok(),
  ).toBe(true);
  expect(
    (await ana.post(`${API}/exercises/${EXERCISE}/answer`, { data: { answer: "a" } })).ok(),
  ).toBe(true);
  expect((await ana.post(`${API}/lessons/${LESSON}/complete`)).ok()).toBe(true);

  const bo = await playwright.request.newContext();
  const boId = await signInApi(bo, emails.bo);
  expect(
    (
      await bo.patch(`${API}/profile`, {
        data: { firstName: "Bo", lastName: "Kowalski" },
        headers: { Accept: "application/json" },
      })
    ).ok(),
  ).toBe(true);

  await link(setup, emails.teacherA, emails.ana);
  await link(setup, emails.teacherB, emails.bo);
  await Promise.all([setup.dispose(), ana.dispose(), bo.dispose()]);

  return { teacherA: emails.teacherA, teacherB: emails.teacherB, anaId, boId };
}

async function openTeacherDashboard(page: Page) {
  await page.getByRole("link", { name: "Teaching" }).click();
  await expect(page).toHaveURL(/\/teacher$/);
  await expect(page.getByRole("heading", { level: 1, name: "Teacher dashboard" })).toBeVisible();
}

test.describe("Teacher dashboard", () => {
  test("a teacher sees only their own students and a student's lesson, exercise and progress data", async ({
    page,
    playwright,
  }) => {
    const classroom = await arrangeClassroom(playwright);
    await signInViaUi(page, classroom.teacherA, PASSWORD);
    await openTeacherDashboard(page);

    const overview = page.getByRole("region", { name: "Overview" });
    await expect(overview.getByText("50%")).toBeVisible();

    const roster = page.getByRole("table", { name: "Your students" });
    await expect(roster.getByRole("link", { name: "Ana Nowak" })).toBeVisible();
    await expect(roster.getByRole("link", { name: "Bo Kowalski" })).toHaveCount(0);
    await expect(roster.getByRole("row")).toHaveCount(2); // header + Ana

    await roster.getByRole("link", { name: "Ana Nowak" }).click();
    await expect(page).toHaveURL(new RegExp(`/teacher/students/${classroom.anaId}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Ana Nowak" })).toBeVisible();

    const lessons = page.getByRole("region", { name: "Lessons" });
    await expect(lessons.getByText("Completed", { exact: true })).toBeVisible();
    await expect(
      lessons.getByRole("progressbar", { name: "PL · A1 lessons completed" }),
    ).toBeVisible();

    const exercises = page.getByRole("region", { name: "Exercises" });
    await expect(exercises.getByText("50%")).toBeVisible();
    await expect(exercises.getByText("1 correct · 1 incorrect")).toBeVisible();

    const points = page.getByRole("region", { name: "Points and achievements" });
    await expect(points.getByText("Total points")).toBeVisible();

    const progress = page.getByRole("region", { name: "Progress over time" });
    await expect(progress.getByRole("table", { name: /Weekly activity/ })).toBeVisible();
  });

  test("teacher A cannot see teacher B's student, in the page or through the API", async ({
    page,
    playwright,
  }) => {
    const classroom = await arrangeClassroom(playwright);
    await signInViaUi(page, classroom.teacherA, PASSWORD);

    // Knowing the id is not enough: the page and the API both answer "not found".
    await page.goto(`/teacher/students/${classroom.boId}`);
    await expect(page.getByRole("heading", { name: "Student not found" })).toBeVisible();
    await expect(page.getByText("Bo Kowalski")).toHaveCount(0);

    const foreign = await page.request.get(`${API}/teacher-dashboard/students/${classroom.boId}`);
    const missing = await page.request.get(
      `${API}/teacher-dashboard/students/00000000-0000-4000-8000-000000000000`,
    );
    expect(foreign.status()).toBe(404);
    expect(await foreign.text()).toBe(await missing.text());

    // A client-supplied teacher id is refused, not honoured.
    const spoofed = await page.request.get(`${API}/teacher-dashboard/students?teacherId=anything`);
    expect(spoofed.status()).toBe(400);
  });

  test("a student is kept out of the teacher dashboard by the page and by the API", async ({
    page,
    playwright,
  }) => {
    const email = uniqueEmail("student-only");
    const setup = await playwright.request.newContext();
    await registerAndVerifyUser(setup, email, PASSWORD);
    await setup.dispose();
    await signInViaUi(page, email, PASSWORD);

    await expect(page.getByRole("link", { name: "Teaching" })).toHaveCount(0);
    await page.goto("/teacher");
    await expect(page.getByRole("heading", { name: "Teachers only" })).toBeVisible();

    for (const path of ["overview", "students"]) {
      const response = await page.request.get(`${API}/teacher-dashboard/${path}`);
      expect(response.status()).toBe(403);
    }
  });

  test("works on a phone-sized screen without sideways scrolling", async ({ page, playwright }) => {
    const classroom = await arrangeClassroom(playwright);
    await page.setViewportSize({ width: 375, height: 800 });
    await signInViaUi(page, classroom.teacherA, PASSWORD);
    await page.goto("/teacher");

    const roster = page.getByRole("table", { name: "Your students" });
    await expect(roster.getByRole("link", { name: "Ana Nowak" })).toBeVisible();
    await expect(roster.getByText(/1 lesson · \d+ points · 50% accuracy/)).toBeVisible();
    const overflow = await page
      .locator("html")
      .evaluate((root) => root.scrollWidth - root.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
