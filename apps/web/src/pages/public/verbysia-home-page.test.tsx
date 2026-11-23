import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { m } from "../../i18n/index.js";
import { VerbysiaHomePage } from "./verbysia-home-page.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderHome() {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(JSON.stringify({ products: [] }), { status: 401 }))),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <VerbysiaHomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("VerbysiaHomePage", () => {
  it("shows the sections in the planned order", () => {
    renderHome();
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    const t = m.marketing.home;
    const order = [t.useTitle, t.productsTitle, t.demoTitle, t.whyTitle, t.phasesTitle];
    expect(order.map((title) => headings.indexOf(title))).toEqual(
      [...order.map((title) => headings.indexOf(title))].sort((a, b) => a - b),
    );
    expect(order.every((title) => headings.includes(title))).toBe(true);
  });

  it("lets a visitor play the demo without an account and see a score", () => {
    renderHome();
    const t = m.marketing.home;
    for (const question of t.demoQuestions) {
      const correct = question.options[question.correct] ?? "";
      fireEvent.click(screen.getByRole("button", { name: correct }));
      expect(screen.getByText(t.demoCorrect)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: t.demoNext }));
    }
    expect(screen.getByText(t.demoScore(3, 3))).toBeInTheDocument();
  });
});
