import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LessonCompletion } from "./lesson-completion.js";

function setup(props: Partial<Parameters<typeof LessonCompletion>[0]> = {}) {
  const onComplete = vi.fn();
  render(
    <LessonCompletion
      status="in_progress"
      isSubmitting={false}
      hasError={false}
      onComplete={onComplete}
      {...props}
    />,
  );
  return { onComplete };
}

describe("LessonCompletion", () => {
  it.each(["not_started", "in_progress"] as const)(
    "offers an explicit Complete lesson action for a %s lesson",
    async (status) => {
      const user = userEvent.setup();
      const { onComplete } = setup({ status });

      await user.click(screen.getByRole("button", { name: "Complete lesson" }));

      expect(onComplete).toHaveBeenCalledTimes(1);
    },
  );

  it("can be operated with the keyboard alone", async () => {
    const user = userEvent.setup();
    const { onComplete } = setup();

    await user.tab();
    expect(screen.getByRole("button", { name: "Complete lesson" })).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("does nothing by itself: no completion happens until the button is used", () => {
    const { onComplete } = setup();

    expect(onComplete).not.toHaveBeenCalled();
  });

  it("disables the button while saving and says so, so it cannot be submitted twice", async () => {
    const user = userEvent.setup();
    const { onComplete } = setup({ isSubmitting: true });

    const button = screen.getByRole("button", { name: "Completing…" });
    await user.click(button);

    expect(button).toBeDisabled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("confirms a completed lesson in a status region and offers no button", () => {
    setup({ status: "completed" });

    expect(screen.getByRole("status")).toHaveTextContent("Lesson completed");
    expect(screen.queryByRole("button", { name: /complete lesson/i })).not.toBeInTheDocument();
  });

  it("keeps the status region in the page before completion, so the confirmation is announced when it appears", () => {
    const { rerender } = render(
      <LessonCompletion
        status="in_progress"
        isSubmitting={false}
        hasError={false}
        onComplete={vi.fn()}
      />,
    );
    const region = screen.getByRole("status");
    expect(region).toBeEmptyDOMElement();

    rerender(
      <LessonCompletion
        status="completed"
        isSubmitting={false}
        hasError={false}
        onComplete={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toBe(region);
    expect(region).toHaveTextContent("Lesson completed");
  });

  it("does not use colour alone to say completed: the words and a check are there", () => {
    setup({ status: "completed" });

    expect(screen.getByRole("status")).toHaveTextContent("Lesson completed");
    expect(screen.getByTestId("completion-check")).toHaveAttribute("aria-hidden", "true");
  });

  it("tells the student when saving failed, keeps the button, and lets them try again", async () => {
    const user = userEvent.setup();
    const { onComplete } = setup({ hasError: true });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't save your progress. Please try again.",
    );
    await user.click(screen.getByRole("button", { name: "Complete lesson" }));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("shows no error once the lesson is completed", () => {
    setup({ status: "completed", hasError: true });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
