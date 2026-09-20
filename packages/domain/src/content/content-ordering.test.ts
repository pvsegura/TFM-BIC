import { describe, expect, it } from "vitest";

import { compareContentItems, sortContentItems } from "./content-ordering.js";

const item = (id: string, order: number) => ({ id, order });

describe("content ordering", () => {
  it("sorts by explicit order, ascending", () => {
    const sorted = sortContentItems([item("b", 30), item("a", 10), item("c", 20)]);
    expect(sorted.map((i) => i.id)).toEqual(["a", "c", "b"]);
  });

  it("breaks ties by id so the result never depends on input order", () => {
    const forward = sortContentItems([item("x", 1), item("y", 1)]);
    const backward = sortContentItems([item("y", 1), item("x", 1)]);
    expect(forward.map((i) => i.id)).toEqual(["x", "y"]);
    expect(backward.map((i) => i.id)).toEqual(["x", "y"]);
  });

  it("does not mutate its input", () => {
    const input = [item("b", 2), item("a", 1)];
    sortContentItems(input);
    expect(input.map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("compares a pair the same way sort does", () => {
    expect(compareContentItems(item("a", 1), item("b", 2))).toBeLessThan(0);
    expect(compareContentItems(item("a", 2), item("b", 1))).toBeGreaterThan(0);
    expect(compareContentItems(item("a", 1), item("a", 1))).toBe(0);
  });
});
