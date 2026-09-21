import type { LessonSummaryResponse } from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";

import { LessonList } from "./lesson-list.js";

function lesson(id: string, status: "not_started" | "in_progress" | "completed" = "not_started") {
  return {
    id,
    languageId: "xx",
    levelId: "a1",
    title: `Title ${id}`,
    description: `About ${id}`,
    order: 1,
    instructionLanguage: "en",
    progress: { status, startedAt: null, completedAt: null },
  } as LessonSummaryResponse;
}

function renderList(lessons: LessonSummaryResponse[]) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <LessonList lessons={lessons} getHref={(item) => `/learn/lessons/${item.id}`} />
      ),
    },
  ]);
  return renderWithProviders(<Stub initialEntries={["/"]} />);
}

describe("LessonList", () => {
  it("is a named ordered list, in the order given (the API already sorted it)", () => {
    renderList([lesson("xx-b"), lesson("xx-a")]);

    const list = screen.getByRole("list", { name: "Lessons" });
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Title xx-b");
    expect(items[1]).toHaveTextContent("Title xx-a");
  });

  it("numbers the lessons by their place in the list, not by the internal order value", () => {
    renderList([lesson("xx-b"), lesson("xx-a")]);

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Lesson 1");
    expect(items[1]).toHaveTextContent("Lesson 2");
  });

  it("links every lesson to the address the caller chose", () => {
    renderList([lesson("xx-a")]);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/learn/lessons/xx-a");
  });

  it("shows each lesson's own state", () => {
    renderList([lesson("xx-a", "completed"), lesson("xx-b", "in_progress"), lesson("xx-c")]);

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Completed");
    expect(items[1]).toHaveTextContent("In progress");
    expect(items[2]).toHaveTextContent("Not started");
  });
});
