import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button.js";

describe("Button", () => {
  it("renders its children as an accessible button", () => {
    render(<Button>Save changes</Button>);

    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("calls onClick when activated", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Continue</Button>);

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respects the disabled attribute", () => {
    render(<Button disabled>Disabled</Button>);

    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
  });
});

describe("Button contrast", () => {
  it("puts navy text on the orange accent fill, not white: white on this orange is about 2.8:1, navy is about 5.5:1 (WCAG AA needs 4.5:1)", () => {
    render(<Button>Save</Button>);

    const classes = screen.getByRole("button", { name: "Save" }).className;
    expect(classes).toContain("bg-accent");
    expect(classes).toContain("text-primary");
    expect(classes).not.toContain("text-white");
  });
});
