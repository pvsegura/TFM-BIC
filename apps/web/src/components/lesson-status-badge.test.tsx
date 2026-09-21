import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LessonStatusBadge } from "./lesson-status-badge.js";

describe("LessonStatusBadge", () => {
  it.each([
    ["not_started", "Not started"],
    ["in_progress", "In progress"],
    ["completed", "Completed"],
  ] as const)("says %s in words, so status is never conveyed by colour alone", (status, label) => {
    render(<LessonStatusBadge status={status} />);

    expect(screen.getByText(label)).toBeVisible();
  });

  it("marks a completed lesson with a check that is hidden from assistive technology", () => {
    render(<LessonStatusBadge status="completed" />);

    expect(screen.getByTestId("completed-indicator")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows no check for a lesson that is not completed", () => {
    render(<LessonStatusBadge status="in_progress" />);

    expect(screen.queryByTestId("completed-indicator")).not.toBeInTheDocument();
  });

  it("exposes the status to tests and styling without relying on the label text", () => {
    render(<LessonStatusBadge status="in_progress" />);

    expect(screen.getByText("In progress").closest("[data-status]")).toHaveAttribute(
      "data-status",
      "in_progress",
    );
  });
});
