import type { LanguagesResponse } from "@verbysia/contracts";
import { renderWithProviders } from "@verbysia/testing";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../services/api-error.js";
import * as catalogApi from "../services/catalog-api.js";
import { LanguagePickerSection } from "./language-picker-section.js";

const LANGUAGES = {
  languages: [
    {
      code: "pl",
      name: "Polish",
      nativeName: "polski",
      locale: "pl-PL",
      direction: "ltr",
      isActive: true,
    },
  ],
} as unknown as LanguagesResponse;

function renderSection(selectedCode?: string) {
  return renderWithProviders(
    <MemoryRouter>
      <LanguagePickerSection
        headingId="test-language-heading"
        selectedCode={selectedCode}
        getHref={(code) => `/learn/vocabulary?language=${code}`}
      />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LanguagePickerSection", () => {
  it("lists the languages under a Language heading, each linking where the page says", async () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);

    renderSection();

    expect(screen.getByRole("heading", { name: "Language" })).toHaveAttribute(
      "id",
      "test-language-heading",
    );
    expect(await screen.findByRole("link", { name: /Polish/ })).toHaveAttribute(
      "href",
      "/learn/vocabulary?language=pl",
    );
  });

  it("says so when there is no language yet", async () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue({ languages: [] });

    renderSection();

    expect(await screen.findByText("No languages are available yet.")).toBeInTheDocument();
  });

  it("offers a retry when the languages could not be loaded", async () => {
    const fetchLanguages = vi
      .spyOn(catalogApi, "fetchLanguages")
      .mockRejectedValueOnce(new ApiError("Something went wrong. Please try again.", 500))
      .mockResolvedValueOnce(LANGUAGES);

    renderSection();
    await userEvent.click(await screen.findByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("link", { name: /Polish/ })).toBeInTheDocument();
    expect(fetchLanguages).toHaveBeenCalledTimes(2);
  });
});
