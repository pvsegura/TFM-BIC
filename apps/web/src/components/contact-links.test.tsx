import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { ContactButtons, FloatingWhatsApp } from "./contact-links.js";

describe("contact buttons", () => {
  it("lead to the contact page while no WhatsApp number or email is configured", () => {
    render(
      <MemoryRouter>
        <ContactButtons compact />
        <FloatingWhatsApp />
      </MemoryRouter>,
    );

    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("href", "/kontakt");
    }
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });
});
