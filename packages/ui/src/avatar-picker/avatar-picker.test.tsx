import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AvatarPicker } from "./avatar-picker.js";

const AVATARS = [
  { id: "avatar-01", label: "Fox" },
  { id: "avatar-02", label: "Owl" },
  { id: "avatar-03", label: "Bear" },
];

function renderPicker(overrides: Partial<Parameters<typeof AvatarPicker>[0]> = {}) {
  const onChange = vi.fn();
  render(
    <AvatarPicker
      legend="Choose your avatar"
      avatars={AVATARS}
      value={null}
      onChange={onChange}
      {...overrides}
    />,
  );
  return { onChange };
}

describe("AvatarPicker", () => {
  it("is a labelled group of radio buttons, one per avatar", () => {
    renderPicker();

    const group = screen.getByRole("group", { name: "Choose your avatar" });
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "Fox" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Owl" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Bear" })).toBeInTheDocument();
  });

  it("has nothing selected when there is no value", () => {
    renderPicker({ value: null });

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).not.toBeChecked();
    }
    expect(screen.queryAllByTestId("avatar-selected-indicator")).toHaveLength(0);
  });

  it("marks exactly the current value as checked", () => {
    renderPicker({ value: "avatar-02" });

    expect(screen.getByRole("radio", { name: "Owl" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Fox" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Bear" })).not.toBeChecked();
  });

  it("shows a visible selected indicator on the chosen avatar only — not colour alone", () => {
    renderPicker({ value: "avatar-03" });

    const indicators = screen.getAllByTestId("avatar-selected-indicator");
    expect(indicators).toHaveLength(1);
    expect(indicators[0]).toHaveTextContent("✓");
    const selectedOption = screen.getByRole("radio", { name: "Bear" }).closest("label");
    expect(selectedOption).toContainElement(indicators[0] ?? null);
  });

  it("calls onChange with the avatar id when an avatar is clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker();

    await user.click(screen.getByRole("radio", { name: "Owl" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("avatar-02");
  });

  it("can be operated by keyboard: Tab into the group, arrows move the selection", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker({ value: "avatar-01" });

    await user.tab();
    expect(screen.getByRole("radio", { name: "Fox" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("avatar-02");
  });

  it("can select the focused avatar with the Space key", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker();

    screen.getByRole("radio", { name: "Bear" }).focus();
    await user.keyboard(" ");

    expect(onChange).toHaveBeenCalledWith("avatar-03");
  });

  it("makes the labels clickable, not just the tiles", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker();

    await user.click(screen.getByText("Bear"));

    expect(onChange).toHaveBeenCalledWith("avatar-03");
  });

  it("disables every option when disabled", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker({ disabled: true });

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }
    await user.click(screen.getByText("Fox"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("announces an error and ties it to the group", () => {
    renderPicker({ error: "Choose one of the available avatars." });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Choose one of the available avatars.");
    expect(screen.getByRole("group", { name: "Choose your avatar" })).toHaveAccessibleDescription(
      "Choose one of the available avatars.",
    );
  });

  it("renders no alert when there is no error", () => {
    renderPicker();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("gives every radio in the group the same name so they behave as one control", () => {
    renderPicker();

    const names = new Set(screen.getAllByRole("radio").map((r) => r.getAttribute("name")));
    expect(names.size).toBe(1);
    expect([...names][0]).toBeTruthy();
  });

  it("renders text labels as plain text, never as HTML", () => {
    renderPicker({ avatars: [{ id: "avatar-01", label: "<img src=x onerror=alert(1)>" }] });

    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});
