import type { ExerciseSummaryResponse } from "@tfm-bic/contracts";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { ExerciseList } from "./exercise-list.js";
import { ExerciseStatusBadge } from "./exercise-status-badge.js";

function summary(
  id: string,
  type: string,
  prompt: string,
  status: "unanswered" | "correct" | "incorrect" = "unanswered",
): ExerciseSummaryResponse {
  return {
    id,
    lessonId: "pl-greetings",
    languageId: "pl",
    levelId: "a1",
    type,
    order: 10,
    prompt,
    instructionLanguage: "en",
    result: {
      status,
      attemptCount: status === "unanswered" ? 0 : 1,
      lastAnsweredAt: status === "unanswered" ? null : "2026-01-01T10:00:00.000Z",
    },
  } as unknown as ExerciseSummaryResponse;
}

const EXERCISES = [
  summary("pl-a", "multiple-choice", "Which greeting is polite?"),
  summary("pl-b", "text-answer", "Type the Polish for: Good night.", "incorrect"),
  summary("pl-c", "true-false", "Cześć is informal.", "correct"),
];

function renderList(exercises = EXERCISES) {
  return render(
    <MemoryRouter>
      <ExerciseList exercises={exercises} getHref={(e) => `/learn/exercises/${e.id}`} />
    </MemoryRouter>,
  );
}

describe("ExerciseStatusBadge", () => {
  it.each([
    ["unanswered", "Not answered"],
    ["correct", "Correct"],
    ["incorrect", "Not correct"],
  ] as const)("says %s in words, so status is never conveyed by colour alone", (status, label) => {
    render(<ExerciseStatusBadge status={status} />);

    expect(screen.getByText(label)).toBeVisible();
  });

  it("marks a correct and an incorrect result with marks that are hidden from assistive technology", () => {
    const { rerender } = render(<ExerciseStatusBadge status="correct" />);
    expect(screen.getByTestId("status-indicator")).toHaveTextContent("✓");
    expect(screen.getByTestId("status-indicator")).toHaveAttribute("aria-hidden", "true");

    rerender(<ExerciseStatusBadge status="incorrect" />);
    expect(screen.getByTestId("status-indicator")).toHaveTextContent("✗");
  });

  it("shows no mark for an exercise that has not been answered", () => {
    render(<ExerciseStatusBadge status="unanswered" />);

    expect(screen.queryByTestId("status-indicator")).not.toBeInTheDocument();
  });

  it("exposes the status to tests and styling without relying on the label text", () => {
    render(<ExerciseStatusBadge status="incorrect" />);

    expect(screen.getByText("Not correct").closest("[data-status]")).toHaveAttribute(
      "data-status",
      "incorrect",
    );
  });
});

describe("ExerciseList", () => {
  it("is a named, ordered list, one item per exercise, numbered by position", () => {
    renderList();

    const list = screen.getByRole("list", { name: "Exercises" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Exercise 1");
    expect(items[2]).toHaveTextContent("Exercise 3");
  });

  it("shows what kind of exercise each is and its prompt", () => {
    renderList();

    expect(screen.getByText("Multiple choice")).toBeInTheDocument();
    expect(screen.getByText("Text answer")).toBeInTheDocument();
    expect(screen.getByText("True or false")).toBeInTheDocument();
    expect(screen.getByText("Which greeting is polite?")).toBeInTheDocument();
  });

  it("tags each prompt with the language it is written in", () => {
    renderList();

    expect(screen.getByText("Which greeting is polite?")).toHaveAttribute("lang", "en");
  });

  it("shows each exercise's own result in words", () => {
    renderList();

    const items = screen.getAllByRole("listitem");
    expect(within(items[0]!).getByText("Not answered")).toBeInTheDocument();
    expect(within(items[1]!).getByText("Not correct")).toBeInTheDocument();
    expect(within(items[2]!).getByText("Correct")).toBeInTheDocument();
  });

  it("offers one link per exercise, whose action matches its state and whose name says which exercise", () => {
    renderList();

    expect(screen.getByRole("link", { name: "Start exercise 1" })).toHaveAttribute(
      "href",
      "/learn/exercises/pl-a",
    );
    expect(screen.getByRole("link", { name: "Try again: exercise 2" })).toHaveAttribute(
      "href",
      "/learn/exercises/pl-b",
    );
    expect(screen.getByRole("link", { name: "Practise again: exercise 3" })).toHaveAttribute(
      "href",
      "/learn/exercises/pl-c",
    );
  });

  it("puts the visible words of an action inside the link's accessible name", () => {
    renderList();

    expect(screen.getByRole("link", { name: /^Start/ })).toHaveTextContent("Start");
    expect(screen.getByRole("link", { name: /^Try again/ })).toHaveTextContent("Try again");
    expect(screen.getByRole("link", { name: /^Practise again/ })).toHaveTextContent(
      "Practise again",
    );
  });

  it("shows prompt text as text: markup in it is inert", () => {
    const { container } = renderList([
      summary("pl-x", "true-false", "<img src=x onerror=alert(1)>"),
    ]);

    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("carries no answer: a list row has none to show", () => {
    renderList();

    expect(screen.queryByText(/Correct answer/)).not.toBeInTheDocument();
  });
});
