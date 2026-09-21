import type { LessonSummaryResponse } from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";

import { LessonCard } from "./lesson-card.js";

function lesson(overrides: Partial<LessonSummaryResponse> = {}) {
  return {
    id: "xx-first",
    languageId: "xx",
    levelId: "a1",
    title: "First lesson",
    description: "About the first lesson.",
    order: 10,
    instructionLanguage: "en",
    progress: { status: "not_started", startedAt: null, completedAt: null },
    ...overrides,
  } as LessonSummaryResponse;
}

function renderCard(item: LessonSummaryResponse, position = 1) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <ol>
          <LessonCard lesson={item} position={position} href={`/learn/lessons/${item.id}`} />
        </ol>
      ),
    },
    { path: "/learn/lessons/:lessonId", Component: () => <p>Lesson page</p> },
  ]);
  return renderWithProviders(<Stub initialEntries={["/"]} />);
}

describe("LessonCard", () => {
  it("shows the title as a heading, the description and the lesson's position", () => {
    renderCard(lesson(), 3);

    expect(screen.getByRole("heading", { level: 3, name: "First lesson" })).toBeInTheDocument();
    expect(screen.getByText("About the first lesson.")).toBeInTheDocument();
    expect(screen.getByText("Lesson 3")).toBeInTheDocument();
  });

  it("is one list item, so a screen reader announces it as part of the ordered list", () => {
    renderCard(lesson());

    expect(screen.getByRole("listitem")).toBeInTheDocument();
  });

  it.each([
    ["not_started", "Start lesson", "Not started"],
    ["in_progress", "Continue lesson", "In progress"],
    ["completed", "Review lesson", "Completed"],
  ] as const)(
    "for a %s lesson offers %j and states the status in words",
    (status, action, statusLabel) => {
      renderCard(lesson({ progress: { status, startedAt: null, completedAt: null } }));

      const card = screen.getByRole("listitem");
      expect(within(card).getByText(statusLabel)).toBeVisible();
      expect(within(card).getByRole("link")).toHaveAccessibleName(`${action}: First lesson`);
    },
  );

  it("offers one action, a link to the lesson — the title is not a second link to the same place", () => {
    renderCard(lesson());

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/learn/lessons/xx-first");
  });

  it("opens the lesson from the keyboard", async () => {
    const user = userEvent.setup();
    renderCard(lesson());

    await user.tab();
    expect(screen.getByRole("link")).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Lesson page")).toBeInTheDocument();
  });

  it("marks the language of the text it shows with the instruction language", () => {
    renderCard(lesson({ instructionLanguage: "es" as never }));

    expect(screen.getByText("About the first lesson.")).toHaveAttribute("lang", "es");
  });

  it("shows markup-looking text as plain text, never as elements", () => {
    renderCard(lesson({ title: "<b>Bold</b>", description: "<img src=x onerror=alert(1)>" }));

    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("<b>Bold</b>");
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("b")).toBeNull();
  });
});
