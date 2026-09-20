import { expect, test, type Page } from "@playwright/test";

/**
 * M5 — Content & Languages, end to end against the real API (NODE_ENV=test,
 * serving the real shipped `content/` tree) behind the real dev server. No
 * login: language and content discovery is public. Nothing here completes a
 * lesson — that is M6.
 */

const A1_TITLES_IN_ORDER = [
  "Greetings and goodbyes",
  "Introducing yourself",
  "Please, thank you and sorry",
  "Polish has no articles",
  "A first look at Polish spelling and sounds",
];

/** Pixels by which the page is wider than the viewport (0 = no sideways scrolling). */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.locator("html").evaluate((root) => root.scrollWidth - root.clientWidth);
}

async function openPolishA1(page: Page) {
  await page.goto("/learn");
  await page.getByRole("link", { name: /Polish/ }).click();
  await expect(page).toHaveURL(/\/learn\/pl$/);
  await page.getByRole("navigation", { name: "Levels" }).getByRole("link", { name: "A1" }).click();
  await expect(page).toHaveURL(/\/learn\/pl\/a1$/);
}

test.describe("language discovery", () => {
  test("shows Polish, with its native name, to a visitor who is not signed in", async ({
    page,
  }) => {
    await page.goto("/learn");

    await expect(
      page.getByRole("heading", { level: 1, name: "Choose what to learn" }),
    ).toBeVisible();
    const polish = page.getByRole("navigation", { name: "Languages" }).getByRole("link", {
      name: /Polish/,
    });
    await expect(polish).toBeVisible();
    await expect(polish).toContainText("polski");
  });

  test("is reachable from the primary navigation", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Learn" })
      .click();

    await expect(page).toHaveURL(/\/learn$/);
  });

  test("selecting Polish shows A1 as the only selectable level", async ({ page }) => {
    await page.goto("/learn");
    await page.getByRole("link", { name: /Polish/ }).click();

    const levels = page.getByRole("navigation", { name: "Levels" });
    await expect(levels.getByRole("link", { name: "A1" })).toBeVisible();
    await expect(levels.getByRole("link")).toHaveCount(1);
    await expect(page.getByRole("link", { name: /Polish/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });
});

test.describe("level filtering", () => {
  test("shows the later CEFR levels as coming soon, and not as something you can select", async ({
    page,
  }) => {
    await page.goto("/learn/pl");

    const levels = page.getByRole("navigation", { name: "Levels" });
    for (const label of ["A2", "B1", "B2", "C1", "C2"]) {
      const item = levels.getByRole("listitem").filter({ hasText: label });
      await expect(item).toContainText("Coming soon");
      await expect(item.getByRole("link")).toHaveCount(0);
    }
  });

  test("a planned level reached by URL says it is coming soon and lists no content", async ({
    page,
  }) => {
    await page.goto("/learn/pl/a2");

    await expect(page.getByText(/A2 is coming soon for Polish/)).toBeVisible();
    await expect(page.getByRole("list", { name: "Content" })).toHaveCount(0);
  });

  test("planned levels are skipped by the keyboard", async ({ page }) => {
    await page.goto("/learn/pl");
    await page.getByRole("link", { name: "A1" }).focus();

    await page.keyboard.press("Tab");

    // Only A1 is a link, so Tab leaves the level list instead of stopping on a planned level.
    await expect(page.getByRole("navigation", { name: "Levels" }).locator(":focus")).toHaveCount(0);
  });
});

test.describe("content discovery", () => {
  test("Polish then A1 lists the representative content, in its defined order", async ({
    page,
  }) => {
    await openPolishA1(page);

    const list = page.getByRole("list", { name: "Content" });
    await expect(list.getByRole("listitem")).toHaveCount(A1_TITLES_IN_ORDER.length);
    const titles = await list.getByRole("link").allTextContents();
    expect(titles).toEqual(A1_TITLES_IN_ORDER);
  });

  test("an item opens to its structured content, with the Polish text tagged as Polish", async ({
    page,
  }) => {
    await openPolishA1(page);

    await page.getByRole("link", { name: "Greetings and goodbyes" }).click();

    await expect(page).toHaveURL(/\/learn\/pl\/a1\/pl-greetings$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Greetings and goodbyes" }),
    ).toBeVisible();
    const polishPhrase = page.getByText("Dzień dobry.", { exact: true });
    await expect(polishPhrase).toBeVisible();
    await expect(polishPhrase).toHaveAttribute("lang", "pl-PL");
    await expect(polishPhrase).toHaveAttribute("dir", "ltr");
    await expect(page.getByText("Good day; hello.")).toBeVisible();
    // A reading view only: no lesson controls (that is M6).
    await expect(
      page.getByRole("button", { name: /complete|start lesson|check|submit/i }),
    ).toHaveCount(0);
  });

  test("a dialogue renders its speakers and lines", async ({ page }) => {
    await page.goto("/learn/pl/a1/pl-introducing-yourself");

    await expect(page.getByText("Piotr", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Mnie też.")).toBeVisible();
  });

  test("the back link returns to the level's content list", async ({ page }) => {
    await page.goto("/learn/pl/a1/pl-greetings");

    await page.getByRole("link", { name: "Back to the content list" }).click();

    await expect(page).toHaveURL(/\/learn\/pl\/a1$/);
    await expect(page.getByRole("list", { name: "Content" })).toBeVisible();
  });

  test("works by keyboard alone: Tab to the language, Enter to choose it", async ({ page }) => {
    await page.goto("/learn");
    await page.getByRole("link", { name: /Polish/ }).focus();

    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/learn\/pl$/);
  });
});

test.describe("routes that do not exist", () => {
  test("an unknown language is a safe not-found, not an error page", async ({ page }) => {
    await page.goto("/learn/zz");

    await expect(page.getByRole("heading", { name: "Language not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Choose a language" })).toBeVisible();
  });

  test("a malformed language code is not-found too, and is never echoed into the page", async ({
    page,
  }) => {
    await page.goto("/learn/%3Cscript%3Ealert(1)%3C%2Fscript%3E");

    await expect(page.getByRole("heading", { name: "Language not found" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("alert(1)");
  });

  test("a level Polish does not offer is not-found", async ({ page }) => {
    await page.goto("/learn/pl/z9");

    await expect(page.getByRole("heading", { name: "Level not found" })).toBeVisible();
  });

  test("content that does not exist is not-found", async ({ page }) => {
    await page.goto("/learn/pl/a1/pl-does-not-exist");

    await expect(page.getByRole("heading", { name: "Content not found" })).toBeVisible();
  });
});

test.describe("dark mode", () => {
  test("the language, level and content UI stays readable and usable in dark mode", async ({
    page,
  }) => {
    await openPolishA1(page);

    await page.getByRole("button", { name: "Toggle dark mode" }).click();

    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(15, 20, 30)");
    await expect(
      page.getByRole("navigation", { name: "Languages" }).getByRole("link", { name: /Polish/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Content" }).getByRole("link").first(),
    ).toBeVisible();
    // The selected level is still identified by more than colour.
    await expect(page.getByRole("link", { name: "A1" })).toHaveAttribute("aria-current", "true");
  });
});

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("the core flow works at 375px and the page never scrolls sideways", async ({ page }) => {
    await openPolishA1(page);

    await expect(
      page.getByRole("list", { name: "Content" }).getByRole("link").first(),
    ).toBeVisible();
    const overflow = await horizontalOverflow(page);
    expect(overflow).toBeLessThanOrEqual(0);

    await page.getByRole("link", { name: "Greetings and goodbyes" }).click();
    await expect(page.getByText("Dzień dobry.", { exact: true })).toBeVisible();
    const detailOverflow = await horizontalOverflow(page);
    expect(detailOverflow).toBeLessThanOrEqual(0);
  });
});

test.describe("public API (through the same origin the app uses)", () => {
  test("GET /languages is public and lists Polish without internal metadata", async ({
    request,
  }) => {
    const response = await request.get("/languages");

    expect(response.status()).toBe(200);
    const body = (await response.json()) as { languages: Record<string, unknown>[] };
    expect(body.languages).toContainEqual({
      code: "pl",
      name: "Polish",
      nativeName: "polski",
      locale: "pl-PL",
      direction: "ltr",
    });
  });

  test("GET /languages/pl/levels reports A1 available and the rest planned", async ({
    request,
  }) => {
    const response = await request.get("/languages/pl/levels");

    const body = (await response.json()) as { levels: { id: string; status: string }[] };
    expect(body.levels.map((l) => `${l.id}:${l.status}`)).toEqual([
      "a1:available",
      "a2:planned",
      "b1:planned",
      "b2:planned",
      "c1:planned",
      "c2:planned",
    ]);
  });

  test("GET /content lists published Polish A1 summaries only", async ({ request }) => {
    const response = await request.get("/content?language=pl&level=a1");

    expect(response.status()).toBe(200);
    const body = (await response.json()) as { items: Record<string, unknown>[] };
    expect(body.items).toHaveLength(A1_TITLES_IN_ORDER.length);
    expect(body.items.map((i) => i.title)).toEqual(A1_TITLES_IN_ORDER);
    for (const item of body.items) {
      expect(item).not.toHaveProperty("blocks");
      expect(item).not.toHaveProperty("status");
    }
  });

  test("refuses unavailable and invalid combinations without leaking detail", async ({
    request,
  }) => {
    expect((await request.get("/content?language=pl&level=a2")).status()).toBe(404);
    expect((await request.get("/content?language=zz&level=a1")).status()).toBe(404);
    expect((await request.get("/content?language=pl&level=z9")).status()).toBe(400);
    expect((await request.get("/content?language=%27%20OR%201%3D1&level=a1")).status()).toBe(400);
    expect((await request.get("/content/..%2F..%2Fpackage.json")).status()).not.toBe(200);
    const notFound = await request.get("/content/pl-does-not-exist");
    expect(await notFound.json()).toEqual({ error: "Content not found." });
  });
});
