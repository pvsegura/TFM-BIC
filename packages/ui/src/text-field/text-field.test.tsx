import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { TextField } from "./text-field.js";

describe("TextField", () => {
  it("associates the label with the input", () => {
    render(<TextField label="Email" />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("lets the user type into the input", async () => {
    const user = userEvent.setup();
    render(<TextField label="Email" />);

    await user.type(screen.getByLabelText("Email"), "user@example.com");

    expect(screen.getByLabelText("Email")).toHaveValue("user@example.com");
  });

  it("shows an error message with role=alert and marks the field invalid", () => {
    render(<TextField label="Email" error="Not a valid email address." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Not a valid email address.");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it("renders no alert when there is no error", () => {
    render(<TextField label="Email" />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("forwards a ref to the underlying input (React Hook Form registration)", () => {
    const ref = createRef<HTMLInputElement>();
    render(<TextField label="Email" ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
