import { expect, test } from "@playwright/test";

import { registerAndVerifyUser, uniqueEmail } from "./helpers/register-and-verify.js";
import { signInViaUi } from "./helpers/ui.js";

/**
 * M11 — Video generation, end to end against the real API (NODE_ENV=test: real server, real
 * HTTP, in-process Postgres, the real shipped `content/` tree) behind the real dev server. The
 * fake `VideoGenerationService` always drives this (VIDEO_GENERATION_PROVIDER defaults to "fake"
 * and this suite never sets it otherwise) — no real Hyperframes/FFmpeg/network dependency, per
 * ADR-012.
 */

const PASSWORD = "a-good-password-123";
const API = "http://localhost:3000";

test.describe("requesting a demo video", () => {
  test("login, open Videos, generate the demo video, and see it complete", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("video");
    await registerAndVerifyUser(request, email, PASSWORD);
    await signInViaUi(page, email, PASSWORD);

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Videos" })
      .click();
    await expect(page).toHaveURL(/\/learn\/videos$/);
    await expect(page.getByRole("heading", { name: "Nasal vowels: ą and ę" })).toBeVisible();

    await page.getByRole("button", { name: "Generate video" }).click();

    // The fake provider (VIDEO_GENERATION_PROVIDER defaults to "fake") can resolve almost
    // instantly, so the transient "queued"/"processing" state is not asserted on here — it would
    // be inherently racy. The completed state is the one outcome guaranteed to be reached.
    await expect(page.getByText("Your video is ready.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate again" })).toBeEnabled();
  });
});

test.describe("security — one student cannot see or act on another student's generation job", () => {
  test("a job is invisible to another student, and cannot be created on someone else's behalf", async ({
    page,
    request,
    browser,
  }) => {
    const email = uniqueEmail("video-owner");
    await registerAndVerifyUser(request, email, PASSWORD);
    await signInViaUi(page, email, PASSWORD);
    await page.goto("/learn/videos");
    await page.getByRole("button", { name: "Generate video" }).click();
    await expect(page.getByText("Your video is ready.")).toBeVisible();

    // The session cookie lives in the page's own browser context, not the bare `request` fixture
    // (a separate, unauthenticated context) — so the authenticated call goes through
    // `page.context().request`, the same way `otherContext.request` is used below.
    const created = await page.context().request.post(`${API}/video-generations`, {
      data: { videoDefinitionId: "pl-a1-nasal-vowels-demo" },
    });
    expect(created.status()).toBe(201);
    const createdBody = (await created.json()) as { id: string };
    const jobId = createdBody.id;

    const otherContext = await browser.newContext();
    const otherEmail = uniqueEmail("video-other");
    await registerAndVerifyUser(otherContext.request, otherEmail, PASSWORD);
    await signInViaUi(await otherContext.newPage(), otherEmail, PASSWORD);

    const otherRead = await otherContext.request.get(`${API}/video-generations/${jobId}`);
    expect(otherRead.status()).toBe(404);

    // A body naming someone else's identity is refused, never silently ignored.
    const forged = await otherContext.request.post(`${API}/video-generations`, {
      data: { videoDefinitionId: "pl-a1-nasal-vowels-demo", userId: "someone-else" },
    });
    expect(forged.status()).toBe(400);

    await otherContext.close();
  });
});
