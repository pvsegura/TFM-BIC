import { expect, test, type Page } from "@playwright/test";

/**
 * M20A — the public homepage: a visitor's journey through the ten scenes to registration, on a
 * desktop and a phone, with and without motion. Aesthetics are not asserted here (see the opt-in
 * visual project); layout integrity, navigation, accessibility and errors are.
 */

const SCENES = [
  "From a word you can’t read to a word you can use.",
  "A word is more than its spelling.",
  "Hear it before you say it.",
  "Then see how it works.",
  "Now it’s your turn.",
  "Words come back until they stay.",
  "Small steps add up.",
  "One level at a time.",
  "Built for more than one language.",
  "Your first word is waiting.",
];

/** Console errors and failed requests, except the anonymous session check: `/auth/me` answers 401
 * to a visitor by design on every page (ADR-006), and the browser logs any 401 as an error. */
function watchForProblems(page: Page): () => string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("401 (Unauthorized)")) {
      problems.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => problems.push(`request failed: ${request.url()}`));
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().endsWith("/auth/me")) {
      problems.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
  return () => problems;
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
}

async function scrollThroughEveryScene(page: Page) {
  for (const name of SCENES) {
    const heading = page.getByRole("heading", { name, exact: true });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeInViewport();
    await expectNoHorizontalOverflow(page);
  }
}

test.describe("public homepage — desktop", () => {
  test("a visitor follows the story from the first word to registration", async ({ page }) => {
    const problems = watchForProblems(page);
    await page.goto("/");

    await expect(page).toHaveTitle("TFM-BIC — Learn a language one word at a time");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(SCENES[0] ?? "");
    await expect(page.locator("[data-motion]")).toHaveAttribute("data-motion", "full");
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();

    await scrollThroughEveryScene(page);

    // Live catalog facts reached the page.
    await expect(page.getByText("Open now")).toBeVisible();
    await expect(page.getByRole("list", { name: "Available" })).toContainText("polski");

    const begin = page.getByRole("region", { name: SCENES[9] });
    await begin.getByRole("link", { name: "Create an account" }).click();
    await expect(page).toHaveURL(/\/register$/);
    expect(problems()).toEqual([]);
  });

  test("scroll drives the pinned scenes' progress without hijacking the scroll", async ({
    page,
  }) => {
    await page.goto("/");
    const listen = page.getByRole("region", { name: SCENES[2] });
    await expect(listen).toHaveAttribute("data-mode", "pinned");

    const progress = () => listen.evaluate((element) => element.style.getPropertyValue("--p"));
    /** Document scroll offset at which the pinned stage has covered `fraction` of its run. */
    const scrollTarget = (fraction: number) =>
      listen.evaluate((element, f) => {
        const top = element.getBoundingClientRect().top + window.scrollY;
        return top + (element.offsetHeight - window.innerHeight) * f;
      }, fraction);

    await page.evaluate((y) => window.scrollTo(0, y), await scrollTarget(0));
    await expect.poll(progress).toBe("0.0000");

    const halfway = await scrollTarget(0.5);
    await page.evaluate((y) => window.scrollTo(0, y), halfway);
    await expect.poll(async () => Number(await progress())).toBeCloseTo(0.5, 1);

    // The page stays exactly where it was scrolled: nothing takes over the scroll position.
    expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(halfway, 0);
  });

  test("the example exercise answers in words, locally", async ({ page }) => {
    await page.goto("/");
    const exercise = page.getByRole("group", {
      name: "Which Polish word means “sorry” or “excuse me”?",
    });
    await exercise.scrollIntoViewIfNeeded();

    await exercise.getByRole("radio", { name: "Tak" }).check();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByRole("status", { name: "Answer feedback" })).toContainText(
      "Not quite — Tak means yes.",
    );

    await exercise.getByRole("radio", { name: "Przepraszam" }).check();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByRole("status", { name: "Answer feedback" })).toContainText("Correct.");
  });

  test("is operable from the keyboard: skip link, then the hero's call to action", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main-content$/);

    const cta = page.getByRole("link", { name: "Create an account" }).first();
    await cta.focus();
    await expect(cta).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/register$/);
  });

  test("has one h1, landmark regions for every scene, and hides decoration from AT", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    for (const name of SCENES) {
      await expect(page.getByRole("region", { name })).toHaveCount(1);
    }
    const exposedSvgs = await page
      .locator("svg:not([aria-hidden='true'] svg, svg[aria-hidden='true'])")
      .count();
    expect(exposedSvgs).toBe(0);
  });
});

test.describe("public homepage — reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("shows every scene settled and static, with the same content", async ({ page }) => {
    const problems = watchForProblems(page);
    await page.goto("/");

    await expect(page.locator("[data-motion]")).toHaveAttribute("data-motion", "reduced");
    await expect(page.locator(".scene__stage")).toHaveCount(0);
    await expect(page.locator("[data-mode='pinned']")).toHaveCount(0);
    // Nothing is driven: no scene carries a scroll progress of its own.
    const driven = await page
      .locator(".scene")
      .evaluateAll(
        (scenes) =>
          scenes.filter((scene) => (scene as HTMLElement).style.getPropertyValue("--p") !== "")
            .length,
      );
    expect(driven).toBe(0);

    await scrollThroughEveryScene(page);
    await expect(page.getByText("/ˈʂkɔ.wa/").first()).toBeVisible();
    expect(problems()).toEqual([]);
  });
});

test.describe("public homepage — phone", () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test("works without pinning, and the menu leads to login", async ({ page }) => {
    const problems = watchForProblems(page);
    await page.goto("/");

    await expect(page.locator("[data-mode='pinned']")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await expect(page.getByRole("link", { name: "Create an account" }).first()).toBeVisible();

    await scrollThroughEveryScene(page);

    await page.evaluate(() => window.scrollTo(0, 0));
    const menu = page.getByRole("button", { name: "Menu" });
    await expect(page.getByRole("link", { name: "Log in" })).toBeHidden();
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("link", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(problems()).toEqual([]);
  });
});

test.describe("public homepage — viewport widths", () => {
  for (const width of [768, 1024, 1920]) {
    test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await scrollThroughEveryScene(page);
    });
  }
});
