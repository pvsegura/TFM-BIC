import type { ContentSummaryResponse } from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";

import { ContentList } from "./content-list.js";

function summary(id: string, overrides: Partial<ContentSummaryResponse> = {}) {
  return {
    id,
    languageId: "xx",
    levelId: "a1",
    type: "lesson",
    title: `Title ${id}`,
    description: `About ${id}`,
    order: 1,
    instructionLanguage: "en",
    ...overrides,
  } as ContentSummaryResponse;
}

function renderList(items: ContentSummaryResponse[]) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => <ContentList items={items} getHref={(item) => `/learn/xx/a1/${item.id}`} />,
    },
  ]);
  return renderWithProviders(<Stub initialEntries={["/"]} />);
}

describe("ContentList", () => {
  it("renders an ordered list, in the order given (the API already sorted it)", () => {
    renderList([summary("xx-b"), summary("xx-a")]);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Title xx-b");
    expect(items[1]).toHaveTextContent("Title xx-a");
    expect(screen.getByRole("list").tagName).toBe("OL");
  });

  it("shows each item's title as a link to its page, with its description", () => {
    renderList([summary("xx-a")]);

    expect(screen.getByRole("link", { name: "Title xx-a" })).toHaveAttribute(
      "href",
      "/learn/xx/a1/xx-a",
    );
    expect(screen.getByText("About xx-a")).toBeInTheDocument();
  });

  it("labels the kind of each item in words", () => {
    renderList([summary("xx-l", { type: "lesson" }), summary("xx-e", { type: "explanation" })]);

    expect(screen.getByText("Lesson")).toBeInTheDocument();
    expect(screen.getByText("Explanation")).toBeInTheDocument();
  });

  it("renders titles as text, never as markup", () => {
    renderList([summary("xx-x", { title: "<img src=x onerror=alert(1)>" })]);

    expect(screen.getByRole("link", { name: "<img src=x onerror=alert(1)>" })).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});
