import { expect, test } from "@playwright/test";

import { registerAndVerifyUser, uniqueEmail } from "./helpers/register-and-verify.js";
import { signInViaUi } from "./helpers/ui.js";

/**
 * M12 — Audio generation, end to end against the real API (NODE_ENV=test: real server, real HTTP,
 * the real shipped `content/` tree) behind the real dev server. The fake `AudioGenerationService`
 * always drives this: AUDIO_GENERATION_PROVIDER defaults to "fake", and loadEnv refuses "gemini"
 * under NODE_ENV=test — no Gemini key, network call or paid request is ever involved (ADR-013).
 */

const PASSWORD = "a-good-password-123";
const API = "http://localhost:3000";

test.describe("listening to a vocabulary entry", () => {
  test("login, open a word, listen to it slowly, and get a clip the browser can actually play", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("audio");
    await registerAndVerifyUser(request, email, PASSWORD);
    await signInViaUi(page, email, PASSWORD);

    await page.goto("/learn/vocabulary/pl-dom");
    await expect(page.getByRole("heading", { level: 1, name: "dom" })).toBeVisible();

    const listen = page.getByRole("group", { name: "Listen" });
    await listen.getByRole("radio", { name: "Slow" }).check();
    await listen.getByRole("button", { name: "Listen to the word" }).click();

    const audio = page.getByLabel("Audio: the word (slow)");
    await expect(audio).toBeVisible();
    await expect(audio).toHaveAttribute("src", /^blob:/);

    // The browser really decoded the WAV the API returned — not just rendered an element.
    const duration = await audio.evaluate(
      (element) =>
        new Promise<number>((resolve, reject) => {
          const media = element as HTMLAudioElement;
          if (media.readyState >= 1) resolve(media.duration);
          media.addEventListener("loadedmetadata", () => resolve(media.duration));
          media.addEventListener("error", () => reject(new Error("audio failed to load")));
        }),
    );
    expect(duration).toBeGreaterThan(0);

    await listen.getByRole("button", { name: "Listen to the example" }).click();
    await expect(page.getByLabel("Audio: the example (slow)")).toBeVisible();
  });
});

test.describe("security — audio generation is authenticated, and the client never supplies the text", () => {
  test("anonymous requests are refused, and free text is rejected for a signed-in student", async ({
    page,
    request,
  }) => {
    const body = {
      source: { type: "vocabulary-item", vocabularyItemId: "pl-dom", part: "lemma" },
      voice: "standard",
    };

    const anonymous = await request.post(`${API}/audio-generations`, { data: body });
    expect(anonymous.status()).toBe(401);

    const email = uniqueEmail("audio-sec");
    await registerAndVerifyUser(request, email, PASSWORD);
    await signInViaUi(page, email, PASSWORD);

    const withText = await page.context().request.post(`${API}/audio-generations`, {
      data: { ...body, text: "Say something else entirely" },
    });
    expect(withText.status()).toBe(400);

    const valid = await page.context().request.post(`${API}/audio-generations`, { data: body });
    expect(valid.status()).toBe(200);
    expect(valid.headers()["content-type"]).toBe("audio/wav");
  });
});
