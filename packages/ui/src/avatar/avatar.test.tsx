import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Avatar } from "./avatar.js";
import { getAvatarGlyph } from "./avatar-glyphs.js";

describe("Avatar", () => {
  it("shows the glyph for the given avatar id with an accessible name", () => {
    render(<Avatar avatarId="avatar-02" label="Owl" />);

    const avatar = screen.getByRole("img", { name: "Owl" });
    expect(avatar).toHaveTextContent(getAvatarGlyph("avatar-02"));
  });

  it("shows a neutral placeholder when no avatar is selected", () => {
    render(<Avatar avatarId={null} />);

    expect(screen.getByRole("img", { name: /no avatar selected/i })).toBeInTheDocument();
  });

  it("does not crash on an id with no glyph", () => {
    render(<Avatar avatarId="avatar-99" label="Mystery" />);

    expect(screen.getByRole("img", { name: "Mystery" })).toBeInTheDocument();
  });
});
