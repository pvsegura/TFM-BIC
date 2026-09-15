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
