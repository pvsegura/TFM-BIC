import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RouteErrorFallback } from "./route-error-fallback.js";

function Broken(): never {
  throw new TypeError("Cannot read properties of undefined (secret detail)");
}

afterEach(() => {
  vi.restoreAllMocks();
});

function renderBroken(report = vi.fn()) {
  // React logs the caught render error to the console; keep the test output clean.
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const router = createMemoryRouter(
    [
      {
        path: "/lessons",
        element: <Broken />,
        errorElement: <RouteErrorFallback report={report} />,
      },
    ],
    { initialEntries: ["/lessons"] },
  );
  render(<RouterProvider router={router} />);
  return report;
}

describe("RouteErrorFallback (M18 error boundary)", () => {
  it("shows a safe message instead of the error, with a way to recover", () => {
    renderBroken();

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload the page" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/");
    expect(document.body.textContent).not.toContain("secret detail");
    expect(document.body.textContent).not.toContain("TypeError");
  });

  it("reports the render error once", () => {
    const report = renderBroken();

    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith("render", expect.any(TypeError));
  });
});
