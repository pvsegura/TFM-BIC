import { readFile } from "node:fs/promises";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import {
  appPathOf,
  getCapturedEmail,
  registerAndVerifyUser,
  uniqueEmail,
} from "./helpers/register-and-verify.js";
import { signInViaUi } from "./helpers/ui.js";

/**
 * M15 — privacy and data management, end to end against the real API (NODE_ENV=test: in-process
 * Postgres, fake email provider — nothing is ever sent) behind the real dev server.
 */

const API = "http://localhost:3000";
const PASSWORD = "a-good-password-123";
const LESSON = "pl-greetings";

interface ExportDocument {
  exportVersion: string;
  account: { userId: string; email: string };
  profile: { nickname: string | null } | null;
  learning: { lessons: { lessonId: string; status: string }[] };
  communication: {
    essentialEmails: string;
    newsletter: { status: string; consentVersion: string; unsubscribedAt: string | null } | null;
  };
}

async function signInApi(request: APIRequestContext, email: string): Promise<string> {
  const response = await request.post(`${API}/auth/login`, { data: { email, password: PASSWORD } });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { id: string }).id;
}

async function openYourData(page: Page): Promise<void> {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Your data", exact: true })).toBeVisible();
}

/** Clicks "Download my data" and returns the saved file's name and parsed content. */
async function downloadExport(page: Page): Promise<{ fileName: string; raw: string }> {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download my data" }).click();
  const download = await downloadPromise;
  const filePath = await download.path();
  return { fileName: download.suggestedFilename(), raw: await readFile(filePath, "utf8") };
}

async function sessionCookieValue(page: Page): Promise<string> {
  const cookie = (await page.context().cookies()).find((c) => c.name === "tfm_bic_session");
  expect(cookie).toBeDefined();
  return cookie!.value;
}

test.describe("Privacy and data management", () => {
  test("a user finds the privacy controls, corrects their profile and downloads their own data without secrets", async ({
    page,
  }) => {
    const email = uniqueEmail("m15-export");
    await registerAndVerifyUser(page.request, email, PASSWORD);
    await signInViaUi(page, email, PASSWORD);
    expect((await page.request.post(`${API}/lessons/${LESSON}/start`)).ok()).toBe(true);

    // The notice is one click away from any page.
    await page.getByRole("link", { name: "Privacy notice" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Privacy notice" })).toBeVisible();
    await expect(page.getByRole("note")).toContainText(/pending legal review/i);

    // Rectification: the existing M4 profile form, on the same page as the data controls.
    await openYourData(page);
    await page.getByLabel("Nickname").fill("exporter");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Profile saved." })).toBeVisible();

    const { fileName, raw } = await downloadExport(page);
    await expect(page.getByText(`Your data was downloaded as ${fileName}.`)).toBeVisible();

    expect(fileName).toMatch(/^tfm-bic-personal-data-\d{4}-\d{2}-\d{2}\.json$/);
    const document = JSON.parse(raw) as ExportDocument;
    expect(document.exportVersion).toBe("1");
    expect(document.account.email).toBe(email);
    expect(document.profile?.nickname).toBe("exporter");
    expect(document.learning.lessons).toEqual([
      expect.objectContaining({ lessonId: LESSON, status: "in_progress" }),
    ]);
    expect(document.communication.essentialEmails).toBe("always-on");

    const cookie = await sessionCookieValue(page);
    for (const secret of [
      PASSWORD,
      cookie,
      "argon2",
      "passwordHash",
      "password_hash",
      "tokenHash",
    ]) {
      expect(raw).not.toContain(secret);
    }
  });

  test("marketing consent can be given and withdrawn without touching the account, and the export shows it", async ({
    page,
  }) => {
    const email = uniqueEmail("m15-consent");
    await registerAndVerifyUser(page.request, email, PASSWORD);
    await signInViaUi(page, email, PASSWORD);

    await openYourData(page);
    await page.getByRole("checkbox", { name: /receive the newsletter/i }).check();
    await page.getByRole("button", { name: "Subscribe" }).click();
    const confirmation = await getCapturedEmail(page.request, email, "newsletter-confirmation");
    await page.goto(appPathOf(confirmation.links[0]!));
    await page.getByRole("button", { name: "Confirm subscription" }).click();
    await expect(page.getByRole("status")).toHaveText(/subscription is confirmed/i);

    await openYourData(page);
    await page.getByRole("button", { name: "Unsubscribe" }).click();
    await expect(page.getByText(/you have unsubscribed from the newsletter/i)).toBeVisible();

    const exported = await page.request.get("/data-management/export");
    expect(exported.status()).toBe(200);
    const document = (await exported.json()) as ExportDocument;
    expect(document.communication.newsletter).toEqual(
      expect.objectContaining({
        status: "unsubscribed",
        consentVersion: expect.any(String),
        unsubscribedAt: expect.any(String),
      }),
    );
    // Withdrawal is not account deletion: the account and its session still work.
    expect((await page.request.get(`${API}/auth/me`)).status()).toBe(200);
  });

  test("deleting an account needs the password, then signs the user out for good", async ({
    page,
    browser,
  }) => {
    const email = uniqueEmail("m15-delete");
    await registerAndVerifyUser(page.request, email, PASSWORD);
    await signInViaUi(page, email, PASSWORD);
    const cookie = await sessionCookieValue(page);

    await openYourData(page);
    await page.getByRole("button", { name: "Delete my account…" }).click();
    await expect(page.getByRole("heading", { name: "Delete your account?" })).toBeFocused();
    await expect(page.getByText(/this cannot be undone/i)).toBeVisible();

    // Wrong password: refused, nothing changes.
    await page.getByLabel("Current password").fill("not-my-password");
    await page.getByRole("checkbox", { name: /permanently deleted/i }).check();
    await page.getByRole("button", { name: "Delete my account permanently" }).click();
    await expect(page.getByRole("alert")).toHaveText("The password is incorrect.");
    expect((await page.request.get(`${API}/auth/me`)).status()).toBe(200);

    // Right password: deleted, signed out, sent to the confirmation page.
    await page.getByLabel("Current password").fill(PASSWORD);
    await page.getByRole("button", { name: "Delete my account permanently" }).click();
    await expect(page).toHaveURL(/\/account-deleted$/);
    await expect(
      page.getByRole("heading", { name: "Your account has been deleted" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();

    // Authenticated pages are no longer reachable.
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/);

    // The old session cookie is dead, even replayed from another browser context.
    const replay = await browser.newContext();
    await replay.addCookies([{ name: "tfm_bic_session", value: cookie, url: API }]);
    expect((await replay.request.get(`${API}/auth/me`)).status()).toBe(401);
    expect((await replay.request.get(`${API}/data-management/export`)).status()).toBe(401);
    await replay.close();

    // The credentials no longer sign in.
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByRole("alert")).toHaveText(/invalid email or password/i);
  });

  test("a teacher never sees another teacher's student, and loses a student who deleted their account", async ({
    playwright,
  }) => {
    const setup = await playwright.request.newContext();
    const emails = {
      teacherA: uniqueEmail("m15-teacher-a"),
      teacherB: uniqueEmail("m15-teacher-b"),
      ana: uniqueEmail("m15-ana"),
      bo: uniqueEmail("m15-bo"),
    };
    for (const email of Object.values(emails)) {
      await registerAndVerifyUser(setup, email, PASSWORD);
    }
    for (const [teacherEmail, studentEmail] of [
      [emails.teacherA, emails.ana],
      [emails.teacherB, emails.bo],
    ] as const) {
      const linked = await setup.post(`${API}/teacher-dashboard/_test/links`, {
        data: { teacherEmail, studentEmail },
      });
      expect(linked.status()).toBe(204);
    }

    const ana = await playwright.request.newContext();
    const anaId = await signInApi(ana, emails.ana);
    const bo = await playwright.request.newContext();
    const boId = await signInApi(bo, emails.bo);
    const teacherA = await playwright.request.newContext();
    await signInApi(teacherA, emails.teacherA);

    // Teacher A: their own student yes, teacher B's student never.
    expect((await teacherA.get(`${API}/teacher-dashboard/students/${anaId}`)).status()).toBe(200);
    expect((await teacherA.get(`${API}/teacher-dashboard/students/${boId}`)).status()).toBe(404);

    // Ana deletes her account; teacher A's roster and detail forget her.
    const deleted = await ana.post(`${API}/data-management/account-deletion`, {
      data: { password: PASSWORD, confirm: true },
    });
    expect(deleted.status()).toBe(204);
    expect((await teacherA.get(`${API}/teacher-dashboard/students/${anaId}`)).status()).toBe(404);
    const roster = (await (await teacherA.get(`${API}/teacher-dashboard/students`)).json()) as {
      students: { studentId: string }[];
    };
    expect(roster.students.map((s) => s.studentId)).not.toContain(anaId);

    // Bo is untouched.
    expect((await bo.get(`${API}/auth/me`)).status()).toBe(200);
    await Promise.all([setup, ana, bo, teacherA].map((context) => context.dispose()));
  });

  test("nobody reaches another user's data: no user id is accepted, and anonymous requests are refused", async ({
    playwright,
  }) => {
    const setup = await playwright.request.newContext();
    const anaEmail = uniqueEmail("m15-idor-ana");
    const benEmail = uniqueEmail("m15-idor-ben");
    await registerAndVerifyUser(setup, anaEmail, PASSWORD);
    await registerAndVerifyUser(setup, benEmail, PASSWORD);

    const ben = await playwright.request.newContext();
    const benId = await signInApi(ben, benEmail);
    const ana = await playwright.request.newContext();
    await signInApi(ana, anaEmail);

    expect((await ana.get(`${API}/data-management/export?userId=${benId}`)).status()).toBe(400);
    const own = await ana.get(`${API}/data-management/export`);
    expect(own.status()).toBe(200);
    const body = await own.text();
    expect(body).toContain(anaEmail);
    expect(body).not.toContain(benEmail);
    expect(body).not.toContain(benId);

    const refused = await ana.post(`${API}/data-management/account-deletion`, {
      data: { password: PASSWORD, confirm: true, userId: benId },
    });
    expect(refused.status()).toBe(400);
    expect((await ben.get(`${API}/auth/me`)).status()).toBe(200);

    const anonymous = await playwright.request.newContext();
    expect((await anonymous.get(`${API}/data-management/export`)).status()).toBe(401);
    expect(
      (
        await anonymous.post(`${API}/data-management/account-deletion`, {
          data: { password: PASSWORD, confirm: true },
        })
      ).status(),
    ).toBe(401);
    await Promise.all([setup, ben, ana, anonymous].map((context) => context.dispose()));
  });
});
