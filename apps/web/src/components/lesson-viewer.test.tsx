import type { LessonResponse } from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { LessonViewer } from "./lesson-viewer.js";

function lesson(overrides: Partial<LessonResponse> = {}) {
  return {
    id: "pl-greetings",
    languageId: "pl",
    levelId: "a1",
    title: "Greetings and goodbyes",
    description: "Say hello.",
    order: 10,
    instructionLanguage: "en",
    progress: { status: "in_progress", startedAt: "2026-01-01T10:00:00.000Z", completedAt: null },
    blocks: [
      { type: "explanation", text: "Polish has formal and informal greetings." },
      { type: "example", text: "Cześć!", translation: "Hi!", note: "Informal." },
      { type: "dialogue", lines: [{ speaker: "Anna", text: "Cześć!", translation: "Hi!" }] },
      { type: "explanation", text: "Use Dzień dobry with people you do not know." },
    ],
    ...overrides,
  } as unknown as LessonResponse;
}

function renderViewer(
  item: LessonResponse,
  props: Partial<Parameters<typeof LessonViewer>[0]> = {},
) {
  const onComplete = vi.fn();
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <LessonViewer
          lesson={item}
          language={{ locale: "pl-PL", direction: "ltr" }}
          isCompleting={false}
          completionFailed={false}
          onComplete={onComplete}
          backHref="/learn/lessons?language=pl&level=a1"
          {...props}
        />
      ),
    },
  ]);
  renderWithProviders(<Stub initialEntries={["/"]} />);
  return { onComplete };
}

describe("LessonViewer", () => {
  it("has one level-one heading, the lesson title, followed by its description and status", () => {
    renderViewer(lesson());

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Greetings and goodbyes" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Say hello.")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeVisible();
  });

  it("renders every block in the order the lesson gives them", () => {
    renderViewer(lesson());

    const text = screen.getByRole("article").textContent;
    const positions = [
      "Polish has formal and informal greetings.",
      "Informal.",
      "Anna",
      "Use Dzień dobry with people you do not know.",
    ].map((fragment) => text.indexOf(fragment));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("tags the learned-language text with the language's locale and direction", () => {
    renderViewer(lesson());

    const [first] = screen.getAllByText("Cześć!");
    expect(first).toHaveAttribute("lang", "pl-PL");
    expect(first).toHaveAttribute("dir", "ltr");
  });

  it("places the completion action after the content, not before it", () => {
    renderViewer(lesson());

    const button = screen.getByRole("button", { name: "Complete lesson" });
    const lastBlock = screen.getByText("Use Dzień dobry with people you do not know.");
    expect(
      lastBlock.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("completes only when the student uses the button", async () => {
    const user = userEvent.setup();
    const { onComplete } = renderViewer(lesson());
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Complete lesson" }));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("keeps the content readable after completion and confirms it", () => {
    renderViewer(
      lesson({
        progress: {
          status: "completed",
          startedAt: "2026-01-01T10:00:00.000Z",
          completedAt: "2026-01-01T10:05:00.000Z",
        } as never,
      }),
    );

    expect(screen.getByText("Polish has formal and informal greetings.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Lesson completed");
    expect(screen.queryByRole("button", { name: "Complete lesson" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
  });

  it("links back to the lesson list the student came from", () => {
    renderViewer(lesson());

    expect(screen.getByRole("link", { name: "Back to lessons" })).toHaveAttribute(
      "href",
      "/learn/lessons?language=pl&level=a1",
    );
  });

  it("shows a neutral notice for a block type it does not know, and still shows the rest", () => {
    renderViewer(
      lesson({
        blocks: [
          { type: "explanation", text: "Known text." },
          { type: "exercise", prompt: "SECRET PROMPT" } as never,
        ],
      }),
    );

    expect(screen.getByText("Known text.")).toBeInTheDocument();
    expect(screen.getByText(/can't be displayed in this version/)).toBeInTheDocument();
    expect(screen.queryByText("SECRET PROMPT")).not.toBeInTheDocument();
  });

  it("never turns lesson text into markup", () => {
    renderViewer(
      lesson({
        blocks: [{ type: "explanation", text: "<script>window.__pwned = 1</script>" }],
      }),
    );

    expect(screen.getByText("<script>window.__pwned = 1</script>")).toBeInTheDocument();
    expect(document.querySelector("article script")).toBeNull();
  });

  it("marks the lesson as written in its instruction language", () => {
    renderViewer(lesson());

    expect(screen.getByRole("article")).toHaveAttribute("lang", "en");
  });
});
