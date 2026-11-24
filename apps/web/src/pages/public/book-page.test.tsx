import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { m } from "../../i18n/index.js";
import { BookPage } from "./book-page.js";

describe("BookPage", () => {
  it("offers the free sample PDF and marks the full edition as coming soon", () => {
    render(
      <MemoryRouter>
        <BookPage />
      </MemoryRouter>,
    );
    const links = screen.getAllByRole("link", { name: m.marketing.book.sampleCta });
    expect(links[0]).toHaveAttribute("href", "/ksiazka/verbysia-hiszpanski-a1-probka.pdf");
    expect(screen.getByText(m.marketing.book.fullBody)).toBeInTheDocument();
  });
});
