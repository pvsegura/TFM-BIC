import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LanguageSwitcher } from "./language-switcher.js";

describe("LanguageSwitcher", () => {
  it("offers Polish, English and Spanish, with Polish selected by default", () => {
    render(<LanguageSwitcher />);

    expect(screen.getByRole("button", { name: "Polski" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Español" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
