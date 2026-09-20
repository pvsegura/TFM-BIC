import type { LanguageResponse } from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";

import { LanguageSelector } from "./language-selector.js";

function language(code: string, overrides: Partial<LanguageResponse> = {}): LanguageResponse {
  return {
    code: code as LanguageResponse["code"],
    name: `Name of ${code}`,
    nativeName: `Native ${code}`,
    locale: code,
    direction: "ltr",
    ...overrides,
  };
}

function renderSelector(languages: LanguageResponse[], selectedCode?: string) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <LanguageSelector
          languages={languages}
          selectedCode={selectedCode}
          getHref={(code) => `/learn/${code}`}
        />
      ),
    },
  ]);
  return renderWithProviders(<Stub initialEntries={["/"]} />);
}

describe("LanguageSelector", () => {
  it("renders one link per language in the catalog, named by name and native name", () => {
    renderSelector([language("aa"), language("bb")]);

    const nav = screen.getByRole("navigation", { name: "Languages" });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAccessibleName(/Name of aa/);
    expect(links[0]).toHaveAccessibleName(/Native aa/);
    expect(links[0]).toHaveAttribute("href", "/learn/aa");
  });

  it("is driven entirely by the data: any language it is given is offered", () => {
    renderSelector([language("zz", { name: "Zzyzx", nativeName: "Zzyzxian" })]);

    expect(screen.getByRole("link", { name: /Zzyzx/ })).toBeInTheDocument();
  });

  it("marks the selected language with aria-current and a visible check mark, not colour alone", () => {
    renderSelector([language("aa"), language("bb")], "bb");

    const selected = screen.getByRole("link", { name: /Name of bb/ });
    expect(selected).toHaveAttribute("aria-current", "true");
    expect(within(selected).getByTestId("selected-indicator")).toBeInTheDocument();
    const other = screen.getByRole("link", { name: /Name of aa/ });
    expect(other).not.toHaveAttribute("aria-current");
    expect(within(other).queryByTestId("selected-indicator")).not.toBeInTheDocument();
  });

  it("tags the native name with its own language and direction, taken from the metadata", () => {
    renderSelector([
      language("aa", { locale: "aa-AA", direction: "ltr" }),
      language("rr", { locale: "rr-RR", direction: "rtl", nativeName: "Rtl native" }),
    ]);

    expect(screen.getByText("Native aa")).toHaveAttribute("lang", "aa-AA");
    expect(screen.getByText("Native aa")).toHaveAttribute("dir", "ltr");
    expect(screen.getByText("Rtl native")).toHaveAttribute("lang", "rr-RR");
    expect(screen.getByText("Rtl native")).toHaveAttribute("dir", "rtl");
  });

  it("is keyboard operable: Tab reaches each language in order", async () => {
    const user = userEvent.setup();
    renderSelector([language("aa"), language("bb")]);

    await user.tab();
    expect(screen.getByRole("link", { name: /Name of aa/ })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: /Name of bb/ })).toHaveFocus();
  });

  it("renders nothing selectable for an empty catalog", () => {
    renderSelector([]);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
