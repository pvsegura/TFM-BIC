import type { ContentResponse } from "@tfm-bic/contracts";
import { renderWithProviders } from "@tfm-bic/testing";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContentBlocks, type LearningLanguage } from "./content-blocks.js";

type Block = ContentResponse["blocks"][number];

const POLISH: LearningLanguage = { locale: "pl-PL", direction: "ltr" };

function renderBlocks(
  blocks: Block[],
  language: LearningLanguage | "none" = POLISH,
  instructionLanguage = "en",
) {
  // "none" stands for missing metadata — `undefined` would just trigger the default above.
  return renderWithProviders(
    <ContentBlocks
      blocks={blocks}
      language={language === "none" ? undefined : language}
      instructionLanguage={instructionLanguage}
    />,
  );
}

describe("ContentBlocks", () => {
  it("renders an explanation as a paragraph in the instruction language", () => {
    renderBlocks([{ type: "explanation", text: "Polish has no articles." }]);

    expect(screen.getByText("Polish has no articles.")).toHaveAttribute("lang", "en");
  });

  it("renders an example: the learning-language text, its translation and its note", () => {
    renderBlocks([{ type: "example", text: "Cześć!", translation: "Hi!", note: "Informal." }]);

    expect(screen.getByText("Cześć!")).toBeInTheDocument();
    expect(screen.getByText("Hi!")).toHaveAttribute("lang", "en");
    expect(screen.getByText("Informal.")).toBeInTheDocument();
  });

  it("tags learning-language text with the language's locale and direction, from metadata", () => {
    renderBlocks([{ type: "example", text: "Cześć!", translation: "Hi!" }], {
      locale: "ar-EG",
      direction: "rtl",
    });

    const text = screen.getByText("Cześć!");
    expect(text).toHaveAttribute("lang", "ar-EG");
    expect(text).toHaveAttribute("dir", "rtl");
  });

  it("lets the browser decide direction when the language metadata is unavailable, never assuming ltr", () => {
    renderBlocks([{ type: "example", text: "Cześć!", translation: "Hi!" }], "none");

    expect(screen.getByText("Cześć!")).toHaveAttribute("dir", "auto");
  });

  it("omits the note when there is none", () => {
    renderBlocks([{ type: "example", text: "Cześć!", translation: "Hi!" }]);

    expect(screen.queryByTestId("example-note")).not.toBeInTheDocument();
  });

  it("renders a dialogue as a list of lines, each with its speaker, text and translation", () => {
    renderBlocks([
      {
        type: "dialogue",
        lines: [
          { speaker: "Anna", text: "Cześć!", translation: "Hi!" },
          { speaker: "Piotr", text: "Cześć!", translation: "Hello!" },
        ],
      },
    ]);

    const lines = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toHaveTextContent("Anna");
    expect(lines[0]).toHaveTextContent("Hi!");
    expect(lines[1]).toHaveTextContent("Piotr");
  });

  it("keeps blocks in the order given", () => {
    renderBlocks([
      { type: "explanation", text: "First" },
      { type: "example", text: "Second", translation: "Second translation" },
      { type: "explanation", text: "Third" },
    ]);

    const text = document.body.textContent ?? "";
    expect(text.indexOf("First")).toBeLessThan(text.indexOf("Second"));
    expect(text.indexOf("Second")).toBeLessThan(text.indexOf("Third"));
  });

  it("renders markup-looking text as inert text: no element is created from it", () => {
    renderBlocks([
      { type: "explanation", text: "<img src=x onerror=alert(1)>" },
      { type: "example", text: "<script>alert(1)</script>", translation: "<b>bold</b>" },
    ]);

    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector("b")).toBeNull();
  });

  it("fails safely on a block type it does not know: a neutral notice, none of its data", () => {
    const unknown = { type: "video", src: "https://evil.example/x.mp4", html: "<b>x</b>" };
    renderBlocks([unknown as unknown as Block, { type: "explanation", text: "Still shown." }]);

    expect(
      screen.getByText("This part can't be displayed in this version of the app."),
    ).toBeInTheDocument();
    expect(screen.getByText("Still shown.")).toBeInTheDocument();
    expect(document.querySelector("video")).toBeNull();
    expect(document.body.innerHTML).not.toContain("evil.example");
  });
});
