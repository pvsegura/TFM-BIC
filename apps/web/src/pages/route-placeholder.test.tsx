import { renderWithProviders } from "@tfm-bic/testing";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RoutePlaceholder } from "./route-placeholder.js";

describe("RoutePlaceholder", () => {
  it("renders the given title as the page heading", () => {
    renderWithProviders(
      <RoutePlaceholder title="Dashboard" description="Student dashboard placeholder." />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
  });

  it("renders the given description", () => {
    renderWithProviders(
      <RoutePlaceholder title="Lessons" description="Lesson list placeholder." />,
    );

    expect(screen.getByText("Lesson list placeholder.")).toBeInTheDocument();
  });
});
