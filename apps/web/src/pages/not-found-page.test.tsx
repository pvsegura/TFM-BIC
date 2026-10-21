import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { NotFoundPage } from "./not-found-page.js";

describe("NotFoundPage", () => {
  it("says the page does not exist, without echoing the address, and leads back home", () => {
    render(
      <MemoryRouter initialEntries={["/no/such/<script>"]}>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
    expect(screen.queryByText(/script/)).not.toBeInTheDocument();
    expect(screen.queryByText(/placeholder|Milestone/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to the homepage" })).toHaveAttribute("href", "/");
  });
});
