import { renderWithProviders } from "@tfm-bic/testing";
import { screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";

import { PRIVACY_NOTICE } from "../legal/privacy-notice.js";
import { PrivacyPage } from "./privacy-page.js";

function renderPage() {
  const Stub = createRoutesStub([{ path: "/privacy", Component: PrivacyPage }]);
  return renderWithProviders(<Stub initialEntries={["/privacy"]} />);
}

describe("PrivacyPage", () => {
  it("shows the notice with its version identifier and date", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Privacy notice" })).toBeInTheDocument();
    expect(screen.getByText("Version privacy-policy-v1 · 26 September 2026")).toBeInTheDocument();
  });

  it("says plainly that it is a draft pending legal review", () => {
    renderPage();

    expect(screen.getByRole("note")).toHaveTextContent(/draft/i);
    expect(screen.getByRole("note")).toHaveTextContent(/legal review/i);
  });

  it("renders every section of the notice as a heading", () => {
    renderPage();

    for (const section of PRIVACY_NOTICE.sections) {
      expect(screen.getByRole("heading", { level: 2, name: section.heading })).toBeInTheDocument();
    }
  });

  it("never claims legal compliance", () => {
    const { container } = renderPage();

    expect(container.textContent).not.toMatch(/gdpr[- ]compliant|fully compliant|we comply with/i);
  });

  it("marks the controller's identity and contact as pending, without inventing an address", () => {
    const { container } = renderPage();

    expect(container.textContent).toMatch(/controller[^.]*pending/i);
    expect(container.textContent).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });

  it("links to the controls on the profile page", () => {
    renderPage();

    expect(screen.getAllByRole("link", { name: /profile page/i })[0]).toHaveAttribute(
      "href",
      "/profile",
    );
  });
});
