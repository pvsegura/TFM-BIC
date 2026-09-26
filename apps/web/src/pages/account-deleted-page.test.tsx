import { renderWithProviders } from "@tfm-bic/testing";
import { screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";

import { AccountDeletedPage } from "./account-deleted-page.js";

describe("AccountDeletedPage", () => {
  it("confirms the deletion and offers a way home", () => {
    const Stub = createRoutesStub([{ path: "/account-deleted", Component: AccountDeletedPage }]);
    renderWithProviders(<Stub initialEntries={["/account-deleted"]} />);

    expect(
      screen.getByRole("heading", { name: "Your account has been deleted" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/signed out/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/");
  });
});
