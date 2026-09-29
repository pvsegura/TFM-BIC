import type { LanguageLevelsResponse, LanguagesResponse } from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as authApi from "../services/auth-api.js";
import * as catalogApi from "../services/catalog-api.js";
import { HomePage } from "./home-page.js";

const POLISH = {
  code: "pl",
  name: "Polish",
  nativeName: "polski",
  locale: "pl-PL",
  direction: "ltr",
} as const;

const LEVELS = {
  language: POLISH,
  levels: [
    { id: "a1", label: "A1", status: "available" },
    { id: "a2", label: "A2", status: "planned" },
    { id: "b1", label: "B1", status: "planned" },
    { id: "b2", label: "B2", status: "planned" },
    { id: "c1", label: "C1", status: "planned" },
    { id: "c2", label: "C2", status: "planned" },
  ],
} as unknown as LanguageLevelsResponse;

const STUDENT = { id: "1", email: "s@example.com", role: "STUDENT", emailVerified: true } as const;

function renderHome() {
  const Stub = createRoutesStub([
    { path: "/", Component: HomePage },
    { path: "/register", Component: () => <h1>Register page</h1> },
    { path: "/learn", Component: () => <h1>Learn page</h1> },
    { path: "/dashboard", Component: () => <h1>Dashboard page</h1> },
  ]);
  return renderWithProviders(<Stub initialEntries={["/"]} />);
}

function mockReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduced && query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })),
  );
}

beforeEach(() => {
  vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(null);
  vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue({
    languages: [POLISH],
  } as unknown as LanguagesResponse);
  vi.spyOn(catalogApi, "fetchLanguageLevels").mockResolvedValue(LEVELS);
  mockReducedMotion(false);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.title = "";
  document.querySelector('meta[name="description"]')?.remove();
});

describe("HomePage — structure", () => {
  it("has one h1 and tells the story in at least eight named scenes", async () => {
    renderHome();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "From a word you can’t read to a word you can use.",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    const scenes = screen.getAllByRole("region");
    expect(scenes.length).toBeGreaterThanOrEqual(8);
    for (const scene of scenes) {
      expect(scene).toHaveAccessibleName();
    }
    await screen.findByText("polski");
  });

  it("names the scenes in narrative order, from discovery to beginning", async () => {
    renderHome();
    const names = screen.getAllByRole("region").map((region) => region.getAttribute("data-scene"));

    expect(names).toEqual([
      "hero",
      "understand",
      "listen",
      "watch",
      "practise",
      "remember",
      "progress",
      "journey",
      "languages",
      "begin",
    ]);
    await screen.findByText("polski");
  });

  it("keeps the word's anatomy in the DOM as text, not only in the animation", async () => {
    renderHome();
    const understand = screen.getByRole("region", { name: "A word is more than its spelling." });

    expect(within(understand).getByText("/ˈʂkɔ.wa/")).toBeInTheDocument();
    expect(within(understand).getByText("Sound")).toBeInTheDocument();
    expect(
      within(understand).getByText(
        "sz sounds like English sh, and ł like English w. Roughly: SHKO-wa.",
      ),
    ).toBeInTheDocument();
    await screen.findByText("polski");
  });

  it("sets the document title and meta description", async () => {
    renderHome();

    expect(document.title).toBe("TFM-BIC — Learn a language one word at a time");
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      "content",
      expect.stringContaining("Lessons, sounds, vocabulary and practice"),
    );
    await screen.findByText("polski");
  });
});

describe("HomePage — calls to action", () => {
  it("invites a visitor to create an account or explore, in the hero and at the end", async () => {
    renderHome();

    const create = await screen.findAllByRole("link", { name: "Create an account" });
    expect(create).toHaveLength(2);
    for (const link of create) expect(link).toHaveAttribute("href", "/register");
    for (const link of screen.getAllByRole("link", { name: "Explore the lessons" })) {
      expect(link).toHaveAttribute("href", "/learn");
    }
  });

  it("sends a signed-in student back to their dashboard instead", async () => {
    vi.spyOn(authApi, "fetchCurrentUser").mockResolvedValue(STUDENT);
    renderHome();

    const dashboard = await screen.findAllByRole("link", { name: "Go to your dashboard" });
    expect(dashboard[0]).toHaveAttribute("href", "/dashboard");
    expect(screen.getAllByRole("link", { name: "Continue your lessons" })[0]).toHaveAttribute(
      "href",
      "/learn/lessons",
    );
    expect(screen.queryByRole("link", { name: "Create an account" })).not.toBeInTheDocument();
  });

  it("navigates to registration from the hero", async () => {
    const user = userEvent.setup();
    renderHome();

    const [heroCta] = await screen.findAllByRole("link", { name: "Create an account" });
    if (heroCta === undefined) throw new Error("no hero call to action");
    await user.click(heroCta);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Register page" }),
    ).toBeInTheDocument();
  });
});

describe("HomePage — practise scene (a local example, nothing is sent)", () => {
  it("explains a wrong answer in words, then confirms the right one", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderHome();
    await screen.findByText("polski");
    fetchSpy.mockClear();

    const exercise = screen.getByRole("group", {
      name: "Which Polish word means “sorry” or “excuse me”?",
    });
    await user.click(within(exercise).getByRole("radio", { name: "Dziękuję" }));
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    const feedback = screen.getByRole("status", { name: "Answer feedback" });
    expect(feedback).toHaveTextContent("Not quite — Dziękuję means thank you.");
    expect(feedback).toHaveTextContent("Przepraszam means sorry and excuse me.");

    await user.click(within(exercise).getByRole("radio", { name: "Przepraszam" }));
    await user.click(screen.getByRole("button", { name: "Check answer" }));
    expect(feedback).toHaveTextContent("Correct.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("asks for a choice before checking", async () => {
    renderHome();
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
    await screen.findByText("polski");
  });
});

describe("HomePage — live catalog facts (never invented)", () => {
  it("shows each CEFR level with the status the catalog reports", async () => {
    renderHome();
    const journey = screen.getByRole("region", { name: "One level at a time." });

    await within(journey).findByText("Open now");
    const levels = within(journey).getAllByRole("listitem");
    expect(levels.map((item) => item.textContent)).toEqual([
      "A1Open now",
      "A2Planned",
      "B1Planned",
      "B2Planned",
      "C1Planned",
      "C2Planned",
    ]);
  });

  it("still shows the CEFR scale, without statuses, when the catalog cannot be read", async () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockRejectedValue(new ApiError("down", 503));
    renderHome();
    const journey = screen.getByRole("region", { name: "One level at a time." });

    expect(
      await within(journey).findByText("Level availability could not be loaded right now."),
    ).toBeInTheDocument();
    expect(
      within(journey)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["A1", "A2", "B1", "B2", "C1", "C2"]);
  });

  it("lists catalog languages as available and roadmap languages as not available yet", async () => {
    renderHome();
    const languages = screen.getByRole("region", { name: "Built for more than one language." });

    const available = within(languages).getByRole("list", { name: "Available" });
    expect(await within(available).findByText("polski")).toBeInTheDocument();
    expect(available).toHaveTextContent("Available now");

    const roadmap = within(languages).getByRole("list", { name: "On the roadmap" });
    expect(within(roadmap).getAllByRole("listitem")).toHaveLength(6);
    expect(roadmap).toHaveTextContent("Not available yet");
  });

  it("never lists a language as on the roadmap once the catalog offers it", async () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue({
      languages: [POLISH, { ...POLISH, code: "es", name: "Spanish", nativeName: "español" }],
    } as unknown as LanguagesResponse);
    renderHome();
    const languages = screen.getByRole("region", { name: "Built for more than one language." });

    const available = within(languages).getByRole("list", { name: "Available" });
    expect(await within(available).findByText("español")).toBeInTheDocument();
    const roadmap = within(languages).getByRole("list", { name: "On the roadmap" });
    expect(roadmap).not.toHaveTextContent("Español");
  });
});

describe("HomePage — motion preference", () => {
  it("renders the animated layout when motion is allowed", async () => {
    const { container } = renderHome();
    expect(container.querySelector("[data-motion]")).toHaveAttribute("data-motion", "full");
    await screen.findByText("polski");
  });

  it("renders the settled, static layout for reduced motion", async () => {
    mockReducedMotion(true);
    const { container } = renderHome();
    expect(container.querySelector("[data-motion]")).toHaveAttribute("data-motion", "reduced");
    await screen.findByText("polski");
  });

  it("hides decorative figures from assistive technology", async () => {
    const { container } = renderHome();
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      expect(svg.closest('[aria-hidden="true"]')).not.toBeNull();
    }
    await screen.findByText("polski");
  });
});
