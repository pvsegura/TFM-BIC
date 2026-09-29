import { expect, test, type Page } from "@playwright/test";

/**
 * M20A visual regression — opt-in (`PW_VISUAL=1`, project `homepage-visual`), because baselines
 * depend on the OS's font rendering. Motion is removed on purpose: the project runs with
 * `prefers-reduced-motion: reduce`, so every scene is in its settled state and the screenshots are
 * deterministic. Nothing animated is compared frame by frame.
 *
 * Regenerate after an intended visual change:
 *   set "PW_VISUAL=1" && pnpm test:e2e --project=homepage-visual --update-snapshots
 */

const SCENES: [string, string][] = [
  ["01-discover", "From a word you can’t read to a word you can use."],
  ["02-understand", "A word is more than its spelling."],
  ["03-listen", "Hear it before you say it."],
  ["04-watch", "Then see how it works."],
  ["05-practise", "Now it’s your turn."],
  ["06-remember", "Words come back until they stay."],
  ["07-progress", "Small steps add up."],
  ["08-journey", "One level at a time."],
  ["09-languages", "Built for more than one language."],
  ["10-begin", "Your first word is waiting."],
];

async function openSettledHomepage(page: Page) {
  await page.goto("/");
  await expect(page.locator("[data-motion]")).toHaveAttribute("data-motion", "reduced");
  await expect(page.getByText("Open now")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test.describe("homepage scenes — desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const [file, name] of SCENES) {
    test(`scene ${file}`, async ({ page }) => {
      await openSettledHomepage(page);
      const scene = page.getByRole("region", { name });
      await scene.scrollIntoViewIfNeeded();
      await expect(scene).toHaveScreenshot(`desktop-${file}.png`, {
        animations: "disabled",
        caret: "hide",
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});

test.describe("homepage — phone and dark theme", () => {
  test("phone: the opening", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openSettledHomepage(page);
    await expect(page).toHaveScreenshot("phone-opening.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("dark theme: the opening", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() =>
      localStorage.setItem(
        "tfm-bic-theme",
        JSON.stringify({ state: { theme: "dark" }, version: 0 }),
      ),
    );
    await openSettledHomepage(page);
    await expect(page).toHaveScreenshot("dark-opening.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
});
